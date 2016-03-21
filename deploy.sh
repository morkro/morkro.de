#!/bin/bash

cd _public
find . -type f -exec curl -u $FTP_USER:$FTP_PASSWORD --ftp-create-dirs -T {} ftp://$FTP_HOST/$FTP_PATH{} \;