var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../../middleware/admin/url_auth')

console.log("hello dot com")

/* GET Ecommerce cash memo Page. */
router.get('/cash_memo', urlAuth('ecommerce cash memo report'), function(req, res, next) {
    const scripts = [
        '/assets/bundles/libscripts.bundle.js',
        '/assets/bundles/vendorscripts.bundle.js',
        '/assets/bundles/c3.bundle.js',
        '/assets/bundles/jvectormap.bundle.js',
        '/assets/bundles/knob.bundle.js',
        '/assets/plugins/momentjs/moment.js',
        '/assets/plugins/bootstrap-material-datetimepicker/js/bootstrap-material-datetimepicker.js',
        '/assets/bundles/mainscripts.bundle.js',
        '/assets/js/pages/index.js',
    ]
    const styles = [
        '/assets/plugins/bootstrap/css/bootstrap.min.css',
        '/assets/plugins/charts-c3/plugin.css',
        '/assets/plugins/jvectormap/jquery-jvectormap-2.0.3.min.css',
        '/assets/plugins/bootstrap-material-datetimepicker/css/bootstrap-material-datetimepicker.css',
        '/assets/css/main.css',
        '/assets/css/color_skins.css',
    ]

    const breadcumb = {
        main: {
            text: 'ecommerce report',
            link: config.get('hostname') + '/dashboard/report/ecommerce'
        },
        sub: [
            {
                text: 'cash memo',
                link: config.get('hostname') + '/dashboard/report/ecommerce/cash-memo'
            }
        ]
    }

    const data = {
        siteTitle: config.get('company').name + " - Report",
        pageTitle: "ecommerce cash memo report",
        adminInfo: req.adminInfo,
    }

    res.render('pages/report/ecommerce/cash_memo', {
        scripts: scripts,
        styles: styles,
        breadcumb: breadcumb,
        data: data,
        companyInfo: config.get('company'),
        host: config.get('hostname')
    });
});

module.exports = router;