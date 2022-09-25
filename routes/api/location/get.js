const express = require('express');
const router = express.Router();

const request = require('request');
const { divisionListInfo, districtListInfo, thanaListInfo } = require('./data/location');

// @route GET api/location
// @description Get user location info
// @access Public
router.get('/', async (req, res) => {
    // const userIP = req.connection.remoteAddress
    const userIP = "27.123.255.54"

    try {
        const options = {
            // uri: 'http://www.geoplugin.net/json.gp?ip='+userIP,
            uri: 'http://api.db-ip.com/v2/free/'+userIP,
            method: 'GET',
            headers: {
                'user-agent': 'node.js'
            }
        }

        request(options, (error, response, body) => {
            if (error) console.error(error)

            if (response.statusCode !== 200) {
                return res.status(404).json({
                    msg: 'Sorry your ip not detected'
                })
            }
            res.json({
                division: JSON.parse(body).city
            })
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/location/common/division
// @description Get user location info
// @access Public
router.get('/common/division', async (req, res) => {
    try {
        return res.status(200).json(divisionListInfo);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/location/common/selected/:division/district
// @description Get user location info
// @access Public
router.get('/common/selected/:division/district', async (req, res) => {
    try {
        let divisionID = req.params.division
        let filteredDistrictList = districtListInfo.filter(districtInfo=>districtInfo.division_id == divisionID)
        return res.status(200).json(filteredDistrictList);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/location/common/selected/:district/thana
// @description Get user location info
// @access Public
router.get('/common/selected/:district/thana', async (req, res) => {
    try {
        let thanaID = req.params.district
        let filteredThanaList = thanaListInfo.filter(thanaInfo=>thanaInfo.district_id == thanaID)
        return res.status(200).json(filteredThanaList);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router