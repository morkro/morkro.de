#!/bin/sh

curl "https://graph.instagram.com/me/media?fields=id,caption,media_url,permalink&access_token=$INSTA_ACCESS_TOKEN" | jq '.data' > ./src/_data/instagram.json
