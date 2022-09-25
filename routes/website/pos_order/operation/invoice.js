var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET login page. */
router.get('/:id', function (req, res, next) {
    const data = {
        siteTitle: config.get('company').name + " - Invoice",
        pageTitle: "Order Invoice",
        orderId: req.params.id
    }

    res.render('pages/invoice/index', {
        data: data,
        companyInfo: config.get('company'),
        host: config.get('hostname')
    });
});

module.exports = router;