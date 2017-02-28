# DotPDev-Backup
This is the backup and scheduling service for DotP

Current schedule should be once daily at 12:00AM the Node-Schedule module should grab a backup of the firebase DB and put a copy in the AWS s3 bucket for storage.

IMPORTANT:  For security, there is a NODE_ENV=dev switch setup for sensitive info.  It expects two credential files - s3CredFile.json and dotpSecKey.json to be located in the parent *of the project folder*, (i.e. not inside the project folder so as not to be checked into source control).

This means that to test changes to this you will first need to see if you can get copies of the files from us.  If we are unavailable, you'll need access to both AWS Console and Firebase Console, grab the credential files from each, and set them up in your local machine - this most likely resets some of the Secrets, so you would then also have to reset the Heroku Config Vars that have been setup based on the existing credential files.
