const express = require('express');
const bodyParser = require('body-parser')

const app = express();
const port = process.env.PORT || 5000;

app.set('views', './src/views')
app.set('view engine','ejs');

app.use(bodyParser.urlencoded({ extended : true }))

app.get('/', (req, res) => {
    res.render('index');
});

app.listen(port, () => {
    console.log(`Listen on port ${port}`)
});
