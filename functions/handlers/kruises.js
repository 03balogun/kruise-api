/**
 * Created by PhpStorm.
 * User: Balogun Wahab
 * Date: 9/4/19
 * Time: 4:30 PM
 */
const {kruiseCollection, db} = require('../util/admin');

module.exports.getAllKruises = async (req, res) => {
    try {
        const data = await kruiseCollection
            .orderBy('createdAt', 'desc')
            .get();
        const kruises = [];
        data.forEach(doc => {
            const kruise = doc.data();
            kruise.kruiseId = doc.id;
            kruises.push(kruise);
        });
        return res.json(kruises)
    } catch (error) {
        console.log(error);
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});

    }
};

module.exports.storeKruise = async (req, res) => {
    try {
        const {body} = req.body;
        if (!body || body.trim() === '') {
            return res.status(400).json({body: 'Body must not be empty'});
        }
        const kruiseBody = {
            body,
            userHandle: req.user.handle,
            userImage: req.user.imageUrl,
            createdAt: new Date().toISOString(),
            likeCount: 0,
            commentCount: 0,
        };
        const data = await kruiseCollection.add(kruiseBody);
        kruiseBody.kruiseId = data.id;
        return res.json(kruiseBody)
    } catch (error) {
        console.log(error);
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});

    }
};

module.exports.getKruise = async (req, res) => {
    try {
        let kruiseData = {};
        const kruise = await db.doc(`/kruises/${req.params.kruiseId}`).get();
        if (!kruise.exists) {
            return res.status(404).json({error: 'Kruise not found'});
        }
        kruiseData = kruise.data();
        kruiseData.kruiseId = kruise.id;
        const kruiseComments = await db.collection('comments')
            .orderBy('createdAt', 'desc')
            .where('kruiseId', '==', kruiseData.kruiseId).get();

        kruiseData.comments = [];

        kruiseComments.forEach(doc => {
            kruiseData.comments.push(doc.data());
        });
        return res.json(kruiseData);
    } catch (error) {
        console.log(error);
        return res.status(500).json({error: error.code});
    }
};


module.exports.commentOnKruise = async (req, res) => {
    try {
        const {body} = req.body;
        if (!body || body.trim() === '') {
            return res.status(400).json({comment: 'Comment must not be empty'});
        }

        const commentBody = {
            body,
            createdAt: new Date().toISOString(),
            kruiseId: req.params.kruiseId,
            userHandle: req.user.handle,
            userImage: req.user.imageUrl
        };
        console.log(commentBody);
        const kruiseDoc = await db.doc(`/kruises/${req.params.kruiseId}`).get();
        if (!kruiseDoc.exists) {
            return res.status(404).json({error: 'Kruise not found'});
        }
        await kruiseDoc.ref.update({commentCount: kruiseDoc.data().commentCount + 1});
        await db.collection('comments').add(commentBody);
        return res.json(commentBody);
    } catch (error) {
        console.log(error);
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});

    }
};

// likeKruise, unlikeKruise

exports.likeKruise = async (req, res) => {
    try {
        const likeDocument = db
            .collection('likes')
            .where('userHandle', '==', req.user.handle)
            .where('kruiseId', '==', req.params.kruiseId)
            .limit(1);
        const kruiseDocument = db.doc(`/kruises/${req.params.kruiseId}`);

        let kruiseData;
        const doc = await kruiseDocument.get();
        if (doc.exists) {
            kruiseData = doc.data();
            kruiseData.kruiseId = doc.id;
            const likeDoc = await likeDocument.get();
            if (likeDoc.empty) {
                await db.collection('likes').add({kruiseId: req.params.kruiseId, userHandle: req.user.handle});
                // Increment like count in post
                kruiseData.likeCount++;
                // Save increment
                await kruiseDocument.update({likeCount: kruiseData.likeCount});
                return res.json(kruiseData);
            }
            return res.status(400).json({error: 'Kruise already liked'});
        }

        return res.status(404).json({error: 'Kruise not found'});
    } catch (error) {
        console.log(error);
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});

    }
};

module.exports.unlikeKruise = async (req, res) => {
    try {
        const likeDocument = db
            .collection('likes')
            .where('userHandle', '==', req.user.handle)
            .where('kruiseId', '==', req.params.kruiseId)
            .limit(1);
        const kruiseDocument = db.doc(`/kruises/${req.params.kruiseId}`);

        let kruiseData;
        const doc = await kruiseDocument.get();
        if (doc.exists) {
            kruiseData = doc.data();
            kruiseData.kruiseId = doc.id;
            const likeDoc = await likeDocument.get();
            if (likeDoc.empty) {
                return res.status(400).json({error: 'Kruise not liked'});
            }
            await db.doc(`/likes/${likeDoc.docs[0].id}`).delete();
            // Increment like count in post
            kruiseData.likeCount--;
            // Save
            await kruiseDocument.update({likeCount: kruiseData.likeCount});
            return res.json(kruiseData);
        }

        return res.status(404).json({error: 'Kruise not found'});
    } catch (error) {
        console.log(error);
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});

    }
};

exports.deleteKruise = async (req, res) => {
    try {
        const document = db.doc(`/kruises/${req.params.kruiseId}`);
        const doc = await document.get();

        if (!doc.exists) return res.status(404).json({error: 'Kruise not found'});

        if (doc.data().userHandle !== req.user.handle) return res.status(403).json({error: 'Unauthorized'});

        await document.delete();
        return res.json({message: 'Kruise deleted successfully'});
    } catch (error) {
        console.log(error);
        return res.status(500).json({general: 'Something went wrong, please try again. If error persist contact admin.'});

    }
};
