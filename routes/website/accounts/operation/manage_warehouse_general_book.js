var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET login page. */
router.get('/warehouse/general_journal/manage', urlAuth('warehouse accounts general book'), function (req, res, next) {
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
      text: 'accounts',
      link: config.get('hostname') + '/dashboard/accounts/'
    },
    sub: [
      {
        text: 'warehouse general journal manage',
        link: config.get('hostname') + '/dashboard/accounts/warehouse/general_journal/manage'
      }
    ]
  }

  const data = {
    siteTitle: config.get('company').name + " - Manage Warehouse General Journal",
    pageTitle: "Warehouse General Journal Manage",
    adminInfo: req.adminInfo,
  }

  res.render('pages/accounts/manage_warehouse_general_book', {
    scripts: scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

module.exports = router;