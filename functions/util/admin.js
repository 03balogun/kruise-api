/**
 * Created by PhpStorm.
 * User: Balogun Wahab
 * Date: 9/4/19
 * Time: 4:26 PM
 */
const firebase = require('firebase');
const admin = require('firebase-admin');
const serviceAccount = require("../kruise-ec380-firebase-adminsdk-q741k-80ef7d2503.json");
const config = require("../config");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://kruise-ec380.firebaseio.com"
});
firebase.initializeApp(config);


const db = admin.firestore();
const kruiseCollection = db.collection('kruises');
const usersCollection = db.collection('users');
const bucket = admin.storage().bucket(config.storageBucket);

module.exports = {
    db,
    admin,
    kruiseCollection,
    usersCollection,
    firebase,
    bucket,
    config
};
