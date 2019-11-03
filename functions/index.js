const functions = require('firebase-functions');
const app = require('express')();
const kruiseHandler = require('./handlers/kruises');
const userHandler = require('./handlers/users');
const {db} = require('./util/admin');


const FBAuth = require('./util/FBAuth');
const cors = require('cors');
app.use(cors());

// kruise
app.get('/kruises', kruiseHandler.getAllKruises);
app.get('/kruise/:kruiseId', kruiseHandler.getKruise);

app.post('/kruise', FBAuth, kruiseHandler.storeKruise);
app.post('/kruise/:kruiseId/comment', FBAuth, kruiseHandler.commentOnKruise);
app.get('/kruise/:kruiseId/like', FBAuth, kruiseHandler.likeKruise);
app.get('/kruise/:kruiseId/unlike', FBAuth, kruiseHandler.unlikeKruise);
app.delete('/kruise/:kruiseId', FBAuth, kruiseHandler.deleteKruise);

// Users route
app.post('/login', userHandler.login);
app.post('/signup', userHandler.signup);
app.post('/user/image', FBAuth, userHandler.uploadImage);
app.post('/user', FBAuth, userHandler.addUserDetails);
app.get('/user', FBAuth, userHandler.getAuthenticatedUserDetails);
app.get('/user/:handle', userHandler.getUserDetails);
app.post('/notifications', FBAuth, userHandler.markNotificationsRead);

exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions
    .firestore.document('likes/{id}')
    .onCreate(async (snapshot) => {
        try {
            const doc = await db
                .doc(`/kruises/${snapshot.data().kruiseId}`).get();
            if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                await db.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date().toISOString(),
                    recipient: doc.data().userHandle,
                    sender: snapshot.data().userHandle,
                    type: 'like',
                    read: false,
                    kruiseId: doc.id
                });
                console.log(`Created Notification for ${doc.data().userHandle}`);
                return;
            }
            return new Error('Could not create notification');
        } catch (error) {
            console.error(error)
        }
    });

exports.deleteNotificationOnUnLike = functions
    .firestore.document('likes/{id}')
    .onDelete(async (snapshot) => {
        try {
            return await db.doc(`/notifications/${snapshot.id}`).delete();
        } catch (error) {
            console.log(error);
        }
    });

exports.createNotificationOnComment = functions
    .firestore.document('comments/{id}')
    .onCreate(async (snapshot) => {
        try {
            const doc = await db.doc(`/kruises/${snapshot.data().kruiseId}`).get();
            if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                return await db.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date().toISOString(),
                    recipient: doc.data().userHandle,
                    sender: snapshot.data().userHandle,
                    type: 'comment',
                    read: false,
                    kruiseId: doc.id
                });
            }
        } catch (error) {
            console.log(error);
        }
    });

// TODO find a way to avoid this function
exports.onUserImageChange = functions.firestore
    .document('/users/{userId}')
    .onUpdate(async (change) => {
        try {
            const before = change.before.data(), after = change.after.data();
            console.log({before, after});
            if (before.imageUrl !== after.imageUrl) {
                console.log('image has changed');
                const batch = db.batch();
                const kruises = await db
                    .collection('kruises')
                    .where('userHandle', '==', before.handle)
                    .get();
                // update all comment images
                kruises.forEach((doc) => {
                    const kruise = db.doc(`/kruises/${doc.id}`);
                    batch.update(kruise, {userImage: after.imageUrl});
                });
                // Todo remove former images dp
                return batch.commit();
            } else return true;
        } catch (error) {
            console.log(error);
        }
    });

// When a kruise is deleted, delete all its related record.
exports.onKruiseDelete = functions
    .firestore.document('/kruises/{kruiseId}')
    .onDelete(async (snapshot, context) => {
        try {
            const kruiseId = context.params.kruiseId, batch = db.batch();
            const comments = await db.collection('comments')
                .where('kruiseId', '==', kruiseId)
                .get();
            comments.forEach((doc) => {
                batch.delete(db.doc(`/comments/${doc.id}`));
            });
            const likes = await db.collection('likes')
                .where('kruiseId', '==', kruiseId)
                .get();
            likes.forEach((doc) => {
                batch.delete(db.doc(`/likes/${doc.id}`));
            });
            const notifications = await db.collection('notifications')
                .where('kruiseId', '==', kruiseId)
                .get();
            notifications.forEach((doc) => {
                batch.delete(db.doc(`/notifications/${doc.id}`));
            });
            return batch.commit();
        } catch (error) {
            console.error(error)
        }
    });
