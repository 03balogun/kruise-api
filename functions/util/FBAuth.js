/**
 * Created by PhpStorm.
 * User: Balogun Wahab
 * Date: 9/4/19
 * Time: 5:25 PM
 */
const { admin, usersCollection } = require('../util/admin');

module.exports = async (req, res, next) => {
    try {
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            const idToken = req.headers.authorization.split('Bearer ')[1];
            req.user = await admin.auth().verifyIdToken(idToken);
            const user = (await usersCollection
                .where('userId', '==', req.user.uid)
                .limit(1)
                .get());

            req.user.handle = user.docs[0].data().handle;
            req.user.imageUrl = user.docs[0].data().imageUrl;
            return next();
        }
        console.log('No authorization token found');
        return res.status(403).json({error: 'Unauthorized'});
    } catch (error) {
        console.error('Error while verifying user token', error);
        if (error.code === 'auth/id-token-expired') {
            return res.status(403).json({error: 'Authentication token expired'});
        }
        return res.status(403).json({error: 'Unauthorized'});
    }
};
