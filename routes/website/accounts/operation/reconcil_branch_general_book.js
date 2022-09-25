var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET login page. */
router.get('/branch/general_journal/reconciliation', urlAuth('accounts general book reconciliation'), function (req, res, next) {
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
        text: 'branch general journal Reconciliation',
        link: config.get('hostname') + '/dashboard/accounts/branch/general_journal/reconciliation'
      }
    ]
  }

  const data = {
    siteTitle: config.get('company').name + " - Reconcil Branch General journal",
    pageTitle: "Branch General journal Reconciliation",
    adminInfo: req.adminInfo,
  }

  res.render('pages/accounts/reconcil_branch_general_book', {
    scripts: scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

module.exports = router;