const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const Offer = require('../../../models/Offer');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');


// @route GET api/offer?branch=
// @description get all offers of specific branch
// @access Private - offer access
router.get('/:pageNo', auth, async (req, res) => {

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'offer')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [
                {
                    msg: 'Account is not authorized for offer'
                }
            ]
        })
    }

    try {
        let dataList = 20
        let offset = (parseInt(req.params.pageNo) - 1) * 20

        let branch = req.query.branch

        let condition = {
            branch
        }

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'title') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            }
        }


        let offer = await Offer.find(condition).limit(dataList).skip(offset).sort({
            _id: -1
        })
        res.status(200).json({
            data: offer
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
})


// @route GET api/api/offer/single/:offerID?branch=
// @description Get single Offer
// @access Private
router.get('/single/:offerID', auth, async (req, res) => {

    try {
        let offer = await Offer.findOne({
            _id: req.params.offerID,
            branch: req.query.branch
        })

        res.status(200).json({
            data: offer
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid offer'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/offer/branch/list?branch=
// @description get all offers of specific branch
// @access public - offer access
router.get('/branch/list', async (req, res) => {
    try {
        let dataList = 10

        let branch = req.query.branch

        let condition = {
            branch,
            isActive: true
        }


        let offers = await Offer.find(condition).limit(dataList).sort({
            _id: -1
        })

        //console.log(product)
        res.status(200).json({
            data: offers
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
})

module.exports = router