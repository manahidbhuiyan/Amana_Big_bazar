var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET Backoffice Delivery Charge */
router.get('/delivery/charge/list', urlAuth('backoffice delivery charge'), function(req, res, next) {
  const scripts = [
    '/assets/bundles/libscripts.bundle.js',
    '/assets/bundles/vendorscripts.bundle.js',
    '/assets/bundles/c3.bundle.js',
    '/assets/bundles/jvectormap.bundle.js',
    '/assets/bundles/knob.bundle.js',
    '/assets/bundles/mainscripts.bundle.js',
    '/assets/js/pages/index.js',
  ]
  const styles = [
    '/assets/plugins/bootstrap/css/bootstrap.min.css',
    '/assets/plugins/charts-c3/plugin.css',
    '/assets/plugins/jvectormap/jquery-jvectormap-2.0.3.min.css',
    '/assets/css/main.css',
    '/assets/css/color_skins.css',
  ]

  const breadcumb = {
    main: {
      text: 'backoffice settings',
      link: config.get('hostname') + '/dashboard/back-office/lookup/list'
    },
    sub: [{
      text: 'delivery charges',
      link: config.get('hostname') + '/dashboard/back-office/delivery/charge/list'
    }]
  }

  const data = {
    siteTitle: config.get('company').name + " - Delivery Charge List",
    pageTitle: "Mange Delivery Charge",
    adminInfo: req.adminInfo,
  }

  res.render('pages/delivery/charges', {
    scripts: scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

module.exports = router;