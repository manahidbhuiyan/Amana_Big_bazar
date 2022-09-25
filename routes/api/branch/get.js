const express = require('express');
const router = express.Router();

const Branch = require('../../../models/Branch');

const helper = require('../../../lib/helpers')

// @route GET api/branch
// @description Get all the branches
// @access Public
router.get('/:pageNo', async (req, res) => {
    try {
        let dataList = 25
        let offset = (parseInt(req.params.pageNo) - 1) * dataList

        let condition = {}

        if (req.query.text !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            condition = {
                [columnName]: {
                    $regex: text,
                    $options: "i"
                }
            }
        }

        let branch = await Branch.find(condition).limit(dataList).skip(offset)

        res.status(200).json({
            data: branch
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/branch
// @description Get all the branches
// @access Public
router.get('/', async (req, res) => {
    try {
        let branch = await Branch.find().select('_id serialNo').select('name address thana district division nbr_sdc_ips')

        res.status(200).json({
            data: branch
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/branch/expect/specific
// @description Get all the branches
// @access Public
router.get('/expect/specific/:branchID', async (req, res) => {
    try {
        let branch = await Branch.find({
            _id: {
                $ne: req.params.branchID
            }
        }).select('_id').select('name')

        res.status(200).json({
            data: branch
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'From branch not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/branch/:branchID
// @description Get single branche
// @access Public
router.get('/data/:branchID', async (req, res) => {

    try {
        let branch = await Branch.findById(req.params.branchID)

        res.status(200).json({
            auth: true,
            data: branch
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(200).json({
                auth: false,
                msg: 'Branch not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/branch/name/:branchName
// @description Get single branche by branchName
// @access Public
router.get('/name/:branchName', async (req, res) => {

    try {
        let branch = await Branch.findOne({
            "division.name": {
                $regex: req.params.branchName,
                $options: "i"
            },
            "isDefaultShop": true
        }).select('-admin -update -isDefaultShop -create')

        if (helper.isObjEmpty(branch)) {
            branch = await Branch.findOne({
                "division.name": {
                    $regex: req.params.branchName,
                    $options: "i"
                }
            }).select('-admin -update -isDefaultShop -create')

            if (helper.isObjEmpty(branch)) {
                branch = await Branch.findOne({}).select('-admin -update -isDefaultShop -create')

                return res.status(200).json({
                    auth: true,
                    data: branch
                });
            }
        } else {
            return res.status(200).json({
                auth: true,
                data: branch
            });
        }
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(200).json({
                auth: false,
                msg: 'Branch not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/branch/division
// @description Get all the branches division unique
// @access Public
router.get('/change/division', async (req, res) => {
    try {
        let divisionsOfBranch = await Branch.find().distinct('division')

        res.status(200).json({
            data: divisionsOfBranch
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/branch/:divisionID/district
// @description Get all the district of specific division
// @access Public
router.get('/change/:divisionID/district', async (req, res) => {
    try {
        let divisionID = req.params.divisionID
        let districtOfBranch = await Branch.find({
            'division.id': divisionID
        }).distinct('district')

        res.status(200).json({
            data: districtOfBranch
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/branch/:districtID/thana
// @description Get all the thana of specific district
// @access Public
router.get('/change/:districtID/thana', async (req, res) => {
    try {
        let districtID = req.params.districtID
        let thanaOfBranch = await Branch.find({
            'district.id': districtID
        }).distinct('thana')

        res.status(200).json({
            data: thanaOfBranch
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/branch/:thanaID/branches
// @description Get all the Branches of specific thana
// @access Public
router.get('/change/:thanaID/branches', async (req, res) => {
    try {
        let thanaID = req.params.thanaID
        let nameOfBranch = await Branch.find({
            'thana.id': thanaID
        }).select("-isDefaultShop -create -update -admin")

        res.status(200).json({
            data: nameOfBranch
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router