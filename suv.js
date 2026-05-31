const API_KEY = 'AIzaSyCPbFD7_-Dfb6694tKO4Q7nymekTRmLubQ';
const API_ROOT = 'https://www.googleapis.com/youtube/v3/';
const CLIENT_ID = '527549401887-jhfhpleebqkf17ubhqn7tvld896m10vc.apps.googleusercontent.com';
const HEADERS = {'headers': {'Accept': 'application/json'}};
let OWNED_PLAYLISTS = new Set();

const client = google.accounts.oauth2.initTokenClient({
  client_id: CLIENT_ID,
  scope: 'https://www.googleapis.com/auth/youtube',
  ux_mode: 'popup',
  callback: oauthResponse,
});

async function oauthResponse(clientResponse) {
  HEADERS['headers']['Authorization'] = `Bearer ${clientResponse.access_token}`;
  await getOwnedPlaylists();
  hideElement("login");
  showElement("loggedIn");
}

async function getOwnedPlaylists() {
  // Gets a list of playlists owned by the current user
  const params = new URLSearchParams(
    {'key': API_KEY, 'part': 'id', 'maxResults': '50', 'mine': 'true'}
  );
  let first = true;
  let nextPageToken = null;
  while (first || nextPageToken) {
    if (nextPageToken) {
      params.delete('pageToken');
      params.append('pageToken', nextPageToken);
    }
    const response = await fetch(`${API_ROOT}playlists?${params.toString()}`, HEADERS)
      .then(response => response.json());
    if ('error' in response)
      throw (response.error.code === 404 ? 'Could not find owned playlists.' : response.error.message);
    console.log(response)
    for (const item of response.items)
      OWNED_PLAYLISTS.add(item['id']);
    nextPageToken = response['nextPageToken'];
    first = false;
  }
  console.log(OWNED_PLAYLISTS);
}

function hideElement(elementId) {
  // Adds the 'hidden' class to an element given its ID
  document.getElementById(elementId).classList.add('hidden');
}

function showElement(elementId) {
  // Removes the 'hidden' class from an element given its ID
  document.getElementById(elementId).classList.remove('hidden');
}

function getFormValue(elementId) {
  // Gets and validates a value from a form element given its ID
  const element = document.getElementById(elementId);
  if (element.value) {
    element.classList.remove('is-invalid');
    return element.value;
  } else
    element.classList.add('is-invalid');
}

async function getVideosInPlaylist(playlistCode) {
  // Gets a list of videos in a playlist given the playlist ID
  const videoIds = new Map();
  const params = new URLSearchParams(
    {'key': API_KEY, 'part': 'id,contentDetails', 'maxResults': '50', 'playlistId': playlistCode}
  );
  let first = true;
  let nextPageToken = null;
  while (first || nextPageToken) {
    if (nextPageToken) {
      params.delete('pageToken');
      params.append('pageToken', nextPageToken);
    }
    const response = await fetch(`${API_ROOT}playlistItems?${params.toString()}`, HEADERS)
      .then(response => response.json());
    if ('error' in response)
      throw (response.error.code === 404 ? 'Playlist not found. Is it private?' : response.error.message);
    for (const item of response.items)
      videoIds.set(item['contentDetails']['videoId'], item['id']);
    nextPageToken = response['nextPageToken'];
    first = false;
  }
  return videoIds;
}

async function getUnavailableVideos(videoIds, countryCode) {
  // Iterates through video IDs and returns a set of available videos and a dict of blocked videos IDs to names
  const blockedVideos = {};
  const availableVideos = new Set();
  const params = new URLSearchParams({'key': API_KEY, 'part': 'id,snippet,contentDetails'});
  const videosIdsArray = Array.from(videoIds.keys());
  for (let i = 0; i < videoIds.size; i += 50) {
    // Can make call for up to 50 video IDs at once
    const idParam = videosIdsArray.slice(i, i + 50).join();
    params.delete('id');
    params.append('id', idParam);
    const response = await fetch(`${API_ROOT}videos?${params.toString()}`, HEADERS)
      .then(response => response.json());
    if ('error' in response)
      throw(response.error.message);
    for (const item of response.items) {
      const contentDetails = item['contentDetails'];
      if (contentDetails['regionRestriction']) {
        // If the allowed field is present, the video is blocked unless the country code is a part of the list
        const allowed = contentDetails['regionRestriction']['allowed'];
        const blocked = contentDetails['regionRestriction']['blocked'];
        if ((allowed && !allowed.includes(countryCode)) || (blocked && blocked.includes(countryCode)))
          blockedVideos[item.id] = item['snippet']['title'];
        else
          availableVideos.add(item.id);
      } else
        availableVideos.add(item.id);
    }
  }
  return [availableVideos, blockedVideos];
}

function outputRow(videoId, videoName, isOwnedPlaylist, playlistItemId) {
  // Outputs a row of the results table
  const row = document.createElement('tr');

  const cell1 = document.createElement('td');
  cell1.appendChild(document.createTextNode(videoId));
  cell1.setAttribute('class', 'align-middle');
  row.appendChild(cell1);

  // If we do not have the video name, it means the video is deleted/private instead of blocked
  const cell2 = document.createElement('td');
  cell2.appendChild(document.createTextNode(videoName ? 'Blocked' : 'Unavailable'));
  cell2.setAttribute('class', 'align-middle');
  row.appendChild(cell2);

  const cell3 = document.createElement('td');
  if (videoName)
    cell3.appendChild(document.createTextNode(videoName));
  cell3.setAttribute('class', 'align-middle');
  row.appendChild(cell3);

  const cell4 = document.createElement('td');
  const archiveUrl = `https://web.archive.org/web/https://www.youtube.com/watch?v=${videoId}`;
  const archiveElement = document.createElement('a');
  archiveElement.setAttribute('href', archiveUrl);
  archiveElement.innerHTML = 'Archive';
  // Search for the name if present, otherwise search for the video ID
  const searchTerm = videoName ? videoName : `%22${videoId}%22`;
  const googleUrl = `https://www.google.com/search?q=${searchTerm}`;
  const googleElement = document.createElement('a');
  googleElement.setAttribute('href', googleUrl);
  googleElement.innerHTML = 'Google';
  cell4.appendChild(archiveElement);
  cell4.appendChild(document.createTextNode(' / '));
  cell4.appendChild(googleElement);
  cell4.setAttribute('class', 'align-middle');
  row.appendChild(cell4);

  // If the playlist is owned by the user, provide removal buttons
  if (isOwnedPlaylist) {
    // Search for the name if present, otherwise search for the video ID
    const cell5 = document.createElement('td');
    cell5.setAttribute('id', `removal-${playlistItemId}`);
    const removalElement = document.createElement('button');
    removalElement.setAttribute('type', 'button');
    removalElement.setAttribute('class', 'btn btn-link btn-sm align-middle');
    removalElement.setAttribute('onclick', `removePlaylistItem("${playlistItemId}")`);
    removalElement.innerHTML = 'Remove';
    cell5.appendChild(removalElement);
    row.appendChild(cell5);
  }

  return row;
}

function outputToTable(videoIds, availableVideos, blockedVideos, isOwnedPlaylist) {
  // Outputs the results table
  const tableBody = document.getElementById('tablebody');
  // Calling this with no arguments removes all children
  tableBody.replaceChildren();
  for (const videoId of videoIds.keys()) {
    if (availableVideos.has(videoId))
      continue;
    const row = outputRow(videoId, blockedVideos[videoId], isOwnedPlaylist, videoIds.get(videoId));
    tableBody.appendChild(row);
  }
}

async function removePlaylistItem(playlistItemId) {
  // Deletes a given playlist item (i.e., removes a video from the user's playlist)
  const params = new URLSearchParams({'key': API_KEY, 'id': playlistItemId});
  const request = new Request(
    `${API_ROOT}playlistItems?${params.toString()}`,
    {headers: HEADERS['headers'], method: 'DELETE'}
  );
  const response = await fetch(request);
  if (response.status === 204)
    document.getElementById(`removal-${playlistItemId}`).innerHTML = '✅ Removed';
  else {
    const json = await response.json();
    document.getElementById(`removal-${playlistItemId}`).innerHTML = `❌ Failed (${json['error']['message']})`;
  }
}

window.addEventListener('load', async function () {
  document.getElementById('submit').onclick = async function () {

    const playlistId = getFormValue('playlistId');
    const countryCode = getFormValue('countryCode');
    if (!playlistId || !countryCode)
      return;
    const ownedPlaylist = OWNED_PLAYLISTS.has(playlistId);

    hideElement('table');
    if (ownedPlaylist)
      showElement('removeFromPlaylist');
    else
      hideElement('removeFromPlaylist');
    hideElement('resultsText');
    hideElement('errorText');
    showElement('spinner');

    try {
      const videoIds = await getVideosInPlaylist(playlistId);
      const [availableVideos, blockedVideos] = await getUnavailableVideos(videoIds, countryCode);
      hideElement('spinner');
      if (videoIds.size !== availableVideos.size) {
        outputToTable(videoIds, availableVideos, blockedVideos, ownedPlaylist);
        showElement('table');
      } else
        showElement('resultsText');
    }
    catch (error) {
      document.getElementById('errorText').textContent = error;
      hideElement('spinner');
      showElement('errorText');
    }
  }
});
