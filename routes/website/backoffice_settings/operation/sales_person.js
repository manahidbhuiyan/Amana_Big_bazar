var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET Backoffice Sales Persons */
router.get('/sales-person/list', urlAuth('backoffice sales person'), function(req, res, next) {
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
      text: 'sales person',
      link: config.get('hostname') + '/dashboard/back-office/sales-person/list'
    }]
  }

  const data = {
    siteTitle: config.get('company').name + " - Sales Person List",
    pageTitle: "Sales Person List",
    adminInfo: req.adminInfo,
  }

  res.render('pages/back_office_settings/sales_person/list', {
    scripts: scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

router.get('/', function(req, res, next) {
  res.redirect('/dashboard/back-office/sales_person/list')
});

module.exports = router;