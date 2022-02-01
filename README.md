# Show Unavailable Videos

If you keep track of your music on Youtube playlists, you might have noticed that there are a few essential quality of
life features missing.

1. If a video gets blocked in your country, you cannot see it when actually playing the playlist and can only view it
   by clicking 'Show unavailable videos' on the playlist settings page. Even then, you cannot see *which* video is 
   blocked, and you have to do a tedious comparison between the two playlist views to find the blocked video.
2. If a video gets deleted or made private, you are only shown the ID on the playlist settings page when 'Show
   unavailable videos' is on, and even then only if your playlist is under a certain size.

Both of these are a massive pain if you have large playlists of favourite music, like I do. So I made a utility to fix
these problems!

Available [here](https://dcragusa.github.io/ShowUnavailableVideos/), you just input your playlist code and country code 
(as videos are blocked by country), and you will be shown a list of blocked or unavailable videos, as well as links
to hopefully find another video with the same music. 

- For blocked videos, the search will be for the video name. 
- For deleted or private videos, the search unfortunately can only be made by ID. If the video was popular enough, hopefully
there will be some reference to it from which you can infer the video title.
