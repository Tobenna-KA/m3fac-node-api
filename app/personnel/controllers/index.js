let Personnel = require('../models');
let UserController = require('../../user/controllers').user;
let UserDB = require('../../user/models');
let jwt = require('../../../helpers/general/jwt');
let helper = require('../../../helpers/general').helpers;
let Mail = require('../../mail/controller').mail;
const TokenGenerator = require('uuid-token-generator');

module.exports.personnel = {
    /**
     * creates new personnel
     * @param req
     * @param res
     * @returns {Promise<void>}
     * @constructor
     */
    NEW_PERSON: async (req, res) => {
        //check that required fields are completed
        if (req.body.email && req.body.first_name && req.body.last_name && req.body.identification && req.body.type) {
            req.body.return_det = true;
            await UserController.NEW_USER(req, res, async (user) => {
                let person = await Personnel.create({personal_det: user._id, type: req.body.type});
                if(!person) {
                    //delete user if unable to create personnel
                    UserDB.findByIdAndDelete(user._id, {}, () => {
                        return res.status(200).send({
                            auth: true,
                            token: null,
                            error: {message: 'Something went wrong'}
                        });
                    })
                } else {
                    jwt.signToken({ id: user._id, level: user.level }, async (result) => {
                        let token = null;
                        let reset_token = await new TokenGenerator().generate();
                        token = result;
                        user.password = null;
                        await Mail.newUserMail({email: req.body.email, token: reset_token}, (sent) => {
                            res.status(200).send({ auth: true, token, person, message: 'Success'});
                        })
                    });
                }
            });

        }else {
            res.status(200).send({auth: true, token: null, error: {message: 'All required fields not filled!'}, ok: false});
        }
        //create user
        //if success add personnel
        // if success send out a mail

        //return error
    },
    GET_PERSON: async (req, res) => {
            // if(await helper.isAdmin(req.headers['authorization'], true))
                if(req.body._id) {
                    let person = await Personnel.findOne({_id: req.body._id})
                        .populate({
                            path: 'personal_det',
                            select: '-password -resetPasswordToken'
                        });
                    // console.log(user)
                    res.status(200).send({auth: true, person})
                } else {
                    res.status(200).send({auth: true, token: null, error: {message: 'All required fields not filled!'}});
                }
            // else res.send({auth: true, error: {message: "You do not have permission to make this change. This issue has been reported"}})
    },
    GET_PERSONNEL: async (req, res) => {
        let personnel = await Personnel.find({}).populate({
            path: 'personal_det',
            select: '-password -resetPasswordToken'
        });
        res.status(200).send({auth: true, personnel})
    },
    /**
     * Edits personnel details
     * @param req
     * @param res
     * @returns {Promise<*>}
     * @constructor
     */
    EDIT_PERSONNEL: async (req, res) => {
        if(req.body.type && req.body._id) {
            Personnel.findByIdAndUpdate(req.body._id, {type: req.body.type}, {new: true}, (err, personnel) => {
                if(err) return res.status(200).send({auth: true, token: null, error: {message: 'Error updating user'} });
                return res.status(200).send({auth: true, token: null, error: false, message: 'success'});
            })
        } else {
            return res.status(200).send({auth: true, token: null, error: {message: 'All required fields not filled!'}});
        }
    }
};