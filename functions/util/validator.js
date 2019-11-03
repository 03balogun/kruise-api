/**
 * Created by PhpStorm.
 * User: Balogun Wahab
 * Date: 9/4/19
 * Time: 5:48 PM
 */
const isEmpty = string => string.trim() === '';
const isEmail = email => {
    const regEx = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i;
    return regEx.test(email);
};

const validateSignUpData = (data) => {
    const errors = {};
    if (!data.email || isEmpty(data.email)) errors.email = 'Must not be empty';
    if (!data.email || !isEmail(data.email)) errors.email = 'Must be a valid email address';
    if (!data.password || isEmpty(data.password)) errors.password = 'Must not be empty';
    if (data.password !== data.confirmPassword) errors.password = 'Passwords must match';
    if (!data.handle || isEmpty(data.handle)) errors.handle = 'Must not be empty';

    return {
        errors,
        valid: Object.keys(errors).length === 0
    }
};

const validateLoginData = (data) => {
    const errors = {};
    if (!data.email || isEmpty(data.email)) errors.email = 'Must not be empty';
    if (!data.password || isEmpty(data.password)) errors.password = 'Must not be empty';
    return {
        errors,
        valid: Object.keys(errors).length === 0
    }
};

const reduceUserDetails = (data) => {
    const {bio, location, website} = data;
    const userDetails = {};
    if (bio && !isEmail(bio)) userDetails.bio = bio;
    if (location && !isEmail(location)) userDetails.location = location;
    if (website && !isEmpty(website)) {
        if (website.substring(0, 4) !== 'http') {
            userDetails.website = `http://${website}`;
        } else userDetails.website = website;
    }
    return userDetails;
};

module.exports = {isEmpty, isEmail, validateSignUpData, validateLoginData, reduceUserDetails};
