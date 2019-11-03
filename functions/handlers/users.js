/**
 * Created by PhpStorm.
 * User: Balogun Wahab
 * Date: 9/4/19
 * Time: 4:30 PM
 */

const {db, firebase, config, bucket} = require('../util/admin');
const {validateSignUpData, validateLoginData, reduceUserDetails} = require('../util/validator');

module.exports.signup = async (req, res) => {
    const {email, password, handle} = req.body;
    try {
        const {valid, errors} = validateSignUpData(req.body);
        if (!valid) return res.status(400).json(errors);

        const handleExist = await db.doc(`/users/${handle}`).get();
        if (handleExist.exists) {
            return res.status(400).json({handle: 'This handle is already taken.'})
        } else {
            let userId = '';
            const token = await firebase
                .auth()
                .createUserWithEmailAndPassword(email, password)
                .then(data => {
                    userId = data.user.uid;
                    return data.user.getIdToken();
                });

            await db.doc(`/users/${handle}`).set({
                email,
                handle,
                userId,
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/no-img.png?alt=media`,
                createdAt: new Date().toISOString()
            });

            return res.status(201).json({token})
        }
    } catch (error) {
        console.log(error);
        if (error.code === 'auth/email-already-in-use') {
            return res.status(500).json({email: 'The email address is already in use by another account.'})
        }
        if (error.code === 'auth/weak-password') {
            return res.status(400).json({password: 'Password should be at least 6 characters.'})
        }
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});
    }
};

module.exports.login = async (req, res) => {
    try {
        const {email, password} = req.body;
        const {valid, errors} = validateLoginData(req.body);
        if (!valid) return res.status(400).json(errors);

        const response = await firebase.auth().signInWithEmailAndPassword(email, password);
        return res.json({token: await response.user.getIdToken()})
    } catch (error) {
        console.log(error);
        const codes = ['auth/wrong-password', 'auth/user-not-found'];
        if (codes.includes(error.code)) return res.status(403).json({general: 'Wrong credentials, please try again.'});
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});

    }

};

module.exports.uploadImage = async (req, res) => {
    const BusBoy = require('busboy'),
        path = require('path'),
        os = require('os'),
        fs = require('fs');

    try {
        console.log("Started Uploaded");
        let imageToBeUploaded = {};
        const busboy = new BusBoy({headers: req.headers});
        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
            if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
                return res.status(400).json({error: 'Wrong file type submitted'});
            }
            const fileNameSplit = filename.split('.');
            const imageExtension = fileNameSplit[fileNameSplit.length - 1];
            const fileName = `${Date.now()}.${imageExtension}`;
            const filePath = path.join(os.tmpdir(), fileName);
            imageToBeUploaded = {filePath, mimetype, fileName};
            file.pipe(fs.createWriteStream(filePath));
        });
        busboy.on('finish', async () => {
            console.log("Finish Uploaded");
            await bucket.upload(imageToBeUploaded.filePath, {
                resumable: false,
                metadata: {
                    metadata: {
                        contentType: imageToBeUploaded.mimetype
                    }
                }
            });
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageToBeUploaded.fileName}?alt=media`;
            await db.doc(`/users/${req.user.handle}`).update({imageUrl});
            return res.json({message: 'Image uploaded successfully.'});
        });
        console.log("Ended Uploaded");
        return busboy.end(req.rawBody);
    } catch (error) {
        console.error(error);
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});

    }

};

module.exports.addUserDetails = async (req, res) => {
    try {
        const userDetails = reduceUserDetails(req.body);
        console.log(userDetails, req.user);
        await db.doc(`/users/${req.user.handle}`).update(userDetails);
        return res.json({message: 'Details added successfully.'});
    } catch (error) {
        console.log(error);
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});

    }
};

module.exports.getAuthenticatedUserDetails = async (req, res) => {
    try {
        const userData = {};
        const handle = req.user.handle;
        const user = await db.doc(`/users/${handle}`).get();
        if (user.exists) {
            userData.credentials = user.data();
            const userLikes = await db.collection('likes')
                .where('userHandle', '==', handle).get();
            userData.likes = [];
            userLikes.forEach(doc => {
                userData.likes.push(doc.data());
            });
            const notifications = await db.collection('notifications')
                .where('recipient', '==', req.user.handle)
                .orderBy('createdAt', 'desc')
                .limit(10).get();
            userData.notifications = [];
            notifications.forEach(doc => {
                const notiObj = doc.data();
                notiObj.notificationId = doc.id;
                userData.notifications.push(notiObj);
            });
            return res.json(userData);
        }
        return res.status(400).json({error: 'User not found!'});
    } catch (error) {
        console.log(error);
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});

    }
};

exports.getUserDetails = async (req, res) => {
    try {
        let userData = {};
        const doc = await db.doc(`/users/${req.params.handle}`).get();
        if (doc.exists) {
            userData.user = doc.data();
            const data = await db.collection('kruises')
                .where('userHandle', '==', req.params.handle)
                .orderBy('createdAt', 'desc')
                .get();
            userData.kruises = [];
            data.forEach((doc) => {
                const dataObj = doc.data();
                if (dataObj.user){
                    console.log(dataObj.user.DocumentReference);
                }
                dataObj.kruiseId = doc.id;
                userData.kruises.push(dataObj);
            });
            return res.json(userData);
        } else {
            return res.status(404).json({error: 'User not found'});
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});

    }
};


exports.markNotificationsRead = async (req, res) => {
    try {
        let batch = db.batch();
        // TODO confirm that this notification belongs to the current handle
        req.body.forEach((notificationId) => {
            const notification = db.doc(`/notifications/${notificationId}`);
            batch.update(notification, {read: true});
        });
        await batch.commit();
        return res.json({message: 'Notifications marked read'});
    } catch (error) {
        console.error(error);
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});
    }
};

