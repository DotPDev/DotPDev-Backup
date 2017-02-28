var AWS = require('aws-sdk');
var admin = require("firebase-admin");
var fs = require('fs');
var schedule = require('node-schedule');

//Firebase setup
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FB_project_id,
    clientEmail: process.env.FB_client_email,
    privateKey: process.env.FB_private_key
  }),
  databaseURL: process.env.FB_database_url
});
var db = admin.database();
var ref = db.ref('/');

//AWS setup
var s3BucketName = process.env.S3_bucket_name;
var s3AccessKey = process.env.S3_access_key;
var s3SecretKey = process.env.S3_secret_key;
var awsRegion = process.env.S3_aws_region;
var filenamePrefix = "firebase-";
AWS.config.region = awsRegion;
AWS.config.credentials = {accessKeyId: s3AccessKey, secretAccessKey: s3SecretKey};
var s3 = new AWS.S3({params: {Bucket: s3BucketName}});

//Node-Schedule for the scheduled backup job - this is every day at 12:00AM.
var backupTask = schedule.scheduleJob('00 00 12 * * 1-7', function(){
    console.log('starting backup task for DotP');
});

//This is the GET from firebase and the POST to AWS bucket
function backDemDataUp() {
    console.log('Starting backup...');
    ref.once("value", function(snapshot) {
      var objParam = {Key: getBackupFilename(), Body: JSON.stringify(snapshot.exportVal())};
        s3.upload(objParam, function (err, data) {
            if (err) {
                console.log(err);
            } else {
                console.log(getCurrentTime() + ": Backup uploaded");
            }
            process.exit();
        });
    });
}

//Utilities
function getBackupFilename() {
    var now = new Date();
    return filenamePrefix + now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate() + '-' + now.getTime() + '.json';
}

function getCurrentTime() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    return yyyy + "-" + mm + "-" + dd + " " + time;
}
