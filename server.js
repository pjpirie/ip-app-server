
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passwordHash = require('password-hash');
const jwt = require('jsonwebtoken');
const CryptoJS = require("crypto-js");
// const authorize = require("./authorize.middleware");

let User = require('./schemas/userSchema');
let Appointment = require('./schemas/appointmentSchema');
let AppointmentType = require('./schemas/appointmentTypeSchema');
let Hospital = require('./schemas/hospitalSchema');
let RefreshToken = require('./schemas/refreshTokenSchema');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
app.use(express.json())

// app.use(express.json());
// app.use(cookieParser());
app.use(cors({
    origin: [
        'https://localhost:3000',
        'http://localhost:3000'
    ],
    credentials: true
}));
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
mongoose.connect(uri).catch(console.error);
const connection = mongoose.connection;
connection.once('open', (res, err) => {
    console.log("Mongoose Database Connection Established Successfully");
});




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
    return jwt.sign(user, jwtSecret, {expiresIn: '300s'});
}

app.get('/', (req, res) => {
    res.status(200).send("Hello, World!")
});

app.get('/auth', authenticateToken, (req, res) => {
    res.status(200);
});

/* 
*   => username / String
*   <= New user created / JSON [200]
*   <X Returns the error / JSON [400]
*/
app.post('/user/register', (req, res) => {
    console.log(req.body);
    const firstname = req.body.first_name;
    const lastname = req.body.last_name;
    const email = req.body.email.toLowerCase();
    const password = passwordHash.generate(req.body.password);
    const phone = req.body.phone;

    /*
    *   Returns 400 status along with an error message 
    *   if any of the required data is not present 
    */
    if ((firstname || lastname || email || password || phone) == (undefined || null)) {
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
                console.table([firstname, lastname, email, password, phone]);
                const newUser = new User({ firstName: firstname, lastName: lastname, email: email, password: password, phone: phone });
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


app.post('/user/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    /*
    *   Returns 400 status along with an error message 
    *   if any of the required data is not present 
    */
    if ((email || password) == (undefined || null)) {
        res.status(400).json('Error: Required Data Missing')
        console.log("Required Data Missing")
    }
    User.findOne({ email: email }, function (err, data) {
        if (err) {
            res.send(err);
        } else {
            if (passwordHash.verify(password, data.password)) {
                const username = req.body.username;
                const user = {name: username, id: data._id};
                const accessToken = genAccessToken(user);

                RefreshToken.exists({ userID: data._id }, (ExistErr, ExistData) => {
                    if(ExistErr){
                        console.log(`Error: ${ExistErr} - TokenData: ${ExistData}`);
                    }else{
                        console.log(ExistData);
                        if(ExistData){
                            RefreshToken.findOne({ userID: data._id }, (TokenErr, TokenData) => {
                                if(TokenErr) return res.status(401).send(TokenErr);
                                if(!TokenData) return res.status(401).send(TokenErr);
                                res.json({Atoken: accessToken, Rtoken: TokenData.token});
                            });
                        }else{
                            const rToken = jwt.sign(user, refreshTokenSecret);
                            const newRefreshToken = new RefreshToken({userID: data._id, token: rToken});
                            newRefreshToken.save()
                            .then(() => res.json({Atoken: accessToken, Rtoken: rToken}))
                            .catch(err => {
                                res.status(400).json(({ error: 'Error creating your account please try again later.'}));
                                console.log('Error: ' + err);
                            });

                            }
                    }
                })
            } else {
                res.json("Error: Incorrect Password");
            }
        }
    });
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

app.post('/appointment/type/new', (req,res) =>{
    const newAppointmentType = new AppointmentType({ 
        title: req.body.title, 
        description: req.body.description, 
        identifier: req.body.identifier
    });
        newAppointmentType.save()
        .then(() => res.json('Appointment Type Added'))
        .catch(err => {
            res.status(400).json(({ error: 'Error creating your appointment type please try again later.'}));
            console.log('Error: ' + err);
        });
});

app.get('/hospitals', (req,res) =>{
    Hospital.find({}, (err, data) => {
        if(err) return res.send(err);
        res.json(data);
    })
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