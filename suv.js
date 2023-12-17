const API_KEY = 'AIzaSyCPbFD7_-Dfb6694tKO4Q7nymekTRmLubQ';
const API_ROOT = 'https://www.googleapis.com/youtube/v3/';
const HEADERS = {'headers': {'Accept': 'application/json'}};

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
  const videoIds = new Set();
  const PLAYLIST_PARAMS = new URLSearchParams(
    {'key': API_KEY, 'part': 'id,contentDetails', 'maxResults': '50', 'playlistId': playlistCode}
  );
  let first = true;
  let nextPageToken = null;
  while (first || nextPageToken) {
    if (nextPageToken) {
      PLAYLIST_PARAMS.delete('pageToken');
      PLAYLIST_PARAMS.append('pageToken', nextPageToken);
    }
    const response = await fetch(`${API_ROOT}playlistItems?${PLAYLIST_PARAMS.toString()}`, HEADERS)
      .then(response => response.json());
    if ('error' in response)
      throw (response.error.code === 404 ? 'Playlist not found. Is it private?' : response.error.message);
    for (const item of response.items)
      videoIds.add(item['contentDetails']['videoId']);
    nextPageToken = response['nextPageToken'];
    first = false;
  }
  return videoIds;
}

async function getUnavailableVideos(videoIds, countryCode) {
  // Iterates through video IDs and returns a set of available videos and a dict of blocked videos IDs to names
  const blockedVideos = {};
  const availableVideos = new Set();
  const VIDEO_PARAMS = new URLSearchParams({'key': API_KEY, 'part': 'id,snippet,contentDetails'});
  const videosIdsArray = Array.from(videoIds);
  for (let i = 0; i < videoIds.size; i += 50) {
    // Can make call for up to 50 video IDs at once
    const idParam = videosIdsArray.slice(i, i + 50).join();
    VIDEO_PARAMS.delete('id');
    VIDEO_PARAMS.append('id', idParam);
    const response = await fetch(`${API_ROOT}videos?${VIDEO_PARAMS.toString()}`, HEADERS)
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

function outputRow(videoId, videoName) {
  // Outputs a row of the results table
  const row = document.createElement('tr');

  const cell1 = document.createElement('td');
  cell1.appendChild(document.createTextNode(videoId));
  row.appendChild(cell1);

  // If we do not have the video name, it means the video is deleted/private instead of blocked
  const cell2 = document.createElement('td');
  cell2.appendChild(document.createTextNode(videoName ? 'Blocked' : 'Unavailable'));
  row.appendChild(cell2);

  const cell3 = document.createElement('td');
  if (videoName)
    cell3.appendChild(document.createTextNode(videoName));
  row.appendChild(cell3);

  // Search for the name if present, otherwise search for the video ID
  const cell4 = document.createElement('td');
  const searchTerm = videoName ? videoName : `%22${videoId}%22`;
  const searchUrl = `https://www.google.com/search?q=${searchTerm}`;
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', searchUrl);
  linkElement.innerHTML = 'Google';
  cell4.appendChild(linkElement);
  row.appendChild(cell4);

  return row;
}

async function outputToTable(videoIds, availableVideos, blockedVideos) {
  // Outputs the results table
  const tableBody = document.getElementById('tablebody');
  // Calling this with no arguments removes all children
  tableBody.replaceChildren();
  for (const videoId of videoIds) {
    if (availableVideos.has(videoId))
      continue;
    const row = outputRow(videoId, blockedVideos[videoId]);
    tableBody.appendChild(row);
  }
}

window.addEventListener('load', async function () {
  document.getElementById('submit').onclick = async function () {

    const playlistId = getFormValue('playlistId');
    const countryCode = getFormValue('countryCode');
    if (!playlistId || !countryCode)
      return;

    hideElement('table');
    hideElement('resultsText');
    hideElement('errorText');
    showElement('spinner');

    try {
      const videoIds = await getVideosInPlaylist(playlistId);
      const [availableVideos, blockedVideos] = await getUnavailableVideos(videoIds, countryCode);
      hideElement('spinner');
      if (videoIds.size !== availableVideos.size) {
        await outputToTable(videoIds, availableVideos, blockedVideos);
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
