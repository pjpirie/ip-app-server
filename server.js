
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passwordHash = require('password-hash');
const jwt = require('jsonwebtoken');
const CryptoJS = require("crypto-js");
// const authorize = require("./authorize.middleware");

let User = require('./schemas/userSchema');
let Appointment = require('./schemas/appointmentSchema');
let Hospital = require('./schemas/hospitalSchema');

let refreshTokens = [];

require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
app.use(express.json())

const posts = [
    {
        username: 'Paul',
        title: 'Post 1'
    },
    {
        username: 'Tim',
        title: 'Post 2'
    }
]

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if(token == null) return res.sendStatus(401);
    jwt.verify(token, jwtSecret, (err, user) => {
        if(err) return res.sendStatus(403);
        req.user = user;
        next();
    });

}

const genAccessToken = (user) => {
    return jwt.sign(user, jwtSecret, {expiresIn: '18000s'});
}

// app.use(express.json());
// app.use(cookieParser());
// app.use(cors({
//     origin: [
//         'https://pjpirie.github.io',
//         'http://pjpirie.github.io',
//         'https://localhost:3000',
//         'http://localhost:3000',
//         'https://vince.ultroniq.co.uk',
//         'http://vince.ultroniq.co.uk',
//         'https://xpcinternational.com',
//         'http://xpcinternational.com',
//         'https://rsdp-backend.herokuapp.com',
//         'http://rsdp-backend.herokuapp.com'
//     ],
//     credentials: true
// }));
// app.use(function(req, res, next) {
//     res.set('Access-Control-Allow-Origin', 'https://xpcinternational.com');
//     res.set('Access-Control-Allow-Credentials', true);
//     res.set('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
//     res.set('Access-Control-Allow-Headers', 'Origin, Product-Session, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Referer, User-Agent');
//     // intercept OPTIONS method
//     if ('OPTIONS' == req.method) {
//       res.send(200);
//     }
//     else {
//       next();
//     }
//   });

const uri = process.env.ATLAS_URI;
// mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });
mongoose.connect(uri).catch(console.error);
const connection = mongoose.connection;
connection.once('open', (res, err) => {
    console.log("Mongoose Database Connection Established Successfully");
});

app.get('/', (req, res) => {
    res.status(200).send("Hello, World!")
});

app.get('/posts', authenticateToken, (req, res) => {
    res.status(200).json(posts.filter(post => post.username === req.user.name));
});

/* 
*   => username / String
*   <= New user created / JSON [200]
*   <X Returns the error / JSON [400]
*/
app.post('/user/register', (req, res) => {
    const firstname = req.body.FirstName;
    const lastname = req.body.LastName;
    const email = req.body.Email.toLowerCase();
    const password = passwordHash.generate(req.body.Password);
    const dob = req.body.DateOfBirth;

    /*
    *   Returns 400 status along with an error message 
    *   if any of the required data is not present 
    */
    if ((firstname || lastname || email || password || dob) == (undefined || null)) {
        console.table({ error: 'Please fill in all form fields'});
        res.json({ error: 'Please fill in all form fields'});
    }

    User.exists({ email: email }, (err, data) => {
        if (err) {
            res.send(err);
        } else {
            if(data){
                res.status(400).json(({ error: 'Email already in our records'}));
            }else{
                console.table([firstname, lastname, email, password, dob]);
                const newUser = new User({ firstName: firstname, lastName: lastname, email: email, password: password, paidAccess: false, modulesCompleted: false, dob: dob });
                newUser.save()
                .then(() => res.json('User Added'))
                .catch(err => {
                    res.status(400).json(({ error: 'Error creating your account please try again later.'}));
                    console.log('Error: ' + err);
                });
            }
        }
    });

    
});

app.post('/user/appointment/new', (req,res) =>{
    const newAppointment = new Appointment({ 
        title: req.body.title, 
        description: req.body.description, 
        number: req.body.number,
        location: req.body.location,
        ward: req.body.ward,
        date: req.body.date,
        time: req.body.time
    });
        newAppointment.save()
        .then(() => res.json('Appointment Added'))
        .catch(err => {
            res.status(400).json(({ error: 'Error creating your appointment please try again later.'}));
            console.log('Error: ' + err);
        });
});

app.post('/hospital/new', (req,res) =>{
    const newHospital = new Hospital({ 
        name: req.body.name, 
        address: req.body.address, 
        postcode: req.body.postcode, 
        number: req.body.number,
        website: req.body.website,
        parking: req.body.parking,
        transport: req.body.transport,
        description: req.body.description,
        mapHTML: req.body.mapHTML,
    });
        newHospital.save()
        .then(() => res.json('Hospital Added'))
        .catch(err => {
            res.status(400).json(({ error: 'Error creating the Hospital please try again later.'}));
            console.log('Error: ' + err);
        });
});

app.post('/login', (req, res) => {
    // Auth user
    const username = req.body.username;
    const user = {name: username};
    const accessToken = genAccessToken(user);
    const refreshToken = jwt.sign(user, refreshTokenSecret)
    refreshTokens.push(refreshToken);
res.json({accessToken: accessToken, refreshToken: refreshToken});
});

app.post('/token', (req, res) => {
const refreshToken = req.body.token;
if(refreshToken == null) return res.sendStatus(401);
if(!refreshTokens.includes(refreshToken)) return res.sendStatus(403);
jwt.verify(refreshToken, refreshTokenSecret, (err, user) => {
    if(err) return res.sendStatus(403).json(err);
    const accessToken = genAccessToken({name: user.name})
    res.json(accessToken);
});
});

app.delete('/logout', (req, res) => {
    refreshTokens = refreshTokens.filter(token => token !== req.body.token);
    res.sendStatus(204);
})  

app.listen(port, '0.0.0.0', () => {
    console.log(`App listening on port ${port}!`);
});
