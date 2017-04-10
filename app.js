var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');

var port = process.env.PORT;
var app = express();
console.log(process.env.PORT);
var indexLocation = 'public';
if (process.env.NODE_ENV === 'production'){
  indexLocation = 'build';
}

// middlewares
app.use(express.static(`${__dirname}/${indexLocation}`));
app.use(function(req, res){
  // redirects unrecognized routes to root
  res.redirect(`localhost:${port}`);
});

// routes
app.get('/', function(req, res){
  res.sendFile(path.join(`${__dirname}/${indexLocation}/index.html`));
})

// run server
if (port) {
  app.listen(port, function(){
      console.log(`Server launched on port ${port}`);
  })
}
