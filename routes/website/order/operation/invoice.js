var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET login page. */
router.get('/:id', urlAuth('online order invoice'), function (req, res, next) {
    const data = {
        siteTitle: config.get('company').name + " - Invoice",
        pageTitle: "Order Invoice",
        orderId: req.params.id,
        adminInfo: req.adminInfo
    }

    res.render('pages/invoice/index', {
        data: data,
        companyInfo: config.get('company'),
        host: config.get('hostname')
    });
});

module.exports = router;