var express = require('express'),
    app = express(),
    asana = require('asana_api'),
    port = process.env.PORT || 8080,
    hostname = 'http://localhost:' + port,
    callback_uri = hostname + '/callback',
    OAuth2 = require('simple-oauth2')({
      clientID: process.env.ASANA_CLIENT_ID,
      clientSecret: process.env.ASANA_CLIENT_SECRET,
      authorizationPath: '/-/oauth_authorize',
      tokenPath: '/-/oauth_token',
      site: 'https://app.asana.com'
    }),
    authorization_uri = OAuth2.AuthCode.authorizeURL({
      redirect_uri: callback_uri
    });

app.use(express.logger());
app.use(express.cookieParser());
app.use(express.session({secret: process.env.BEST_SECRET_EVER}));

app.get('/', function(request, response) {
  var access_token = request.session.access_token;
  if (typeof access_token !== 'undefined') {
    asana.setResourceOwner(access_token);
    asana.getUserMe(null, function(error, me) {
      if (error) {
        response.send('yo whattup homy we gots problem');
      } else {
        response.send('yo whattup homy' + me.data.name);
      }
    });
  } else {
    response.redirect(authorization_uri);
  }
});

app.get('/callback', function(request, response) {
  var code = request.query.code;
  console.log('/callback');
  OAuth2.AuthCode.getToken({
    code: code,
    redirect_uri: callback_uri
  }, saveToken);

  function saveToken(error, result) {
    if (error) {
      console.log('Access Token Error', error.message);
      response.send('bad problem yo');
    } else {
      var token = OAuth2.AccessToken.create(result);
      request.session.access_token = token;
      console.log('token is', token);
      response.redirect('/');
    }
  }
});

app.listen(port, function() {
    console.log("Listening on " + port);
});
