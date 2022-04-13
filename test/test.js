/* eslint-disable no-unused-expressions */
const chai = require('chai'); 
let expect = chai.expect;

const chaiHttp = require('chai-http');
let server = 'http://localhost:5000';

const testPrefix = "[BuildChecker]>";

chai.use(chaiHttp);

require('dotenv').config();
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;

let testUser = {
    first_name: "Tes",
    last_name: "Ter",
    email: 'test@test.com',
    password: 'test',
    phone: '0712345678'
}

let token = {};

let userID = '';

let tempEmail = 'init';

describe('Server Responding', () => {
    it('[GET][/] > Ping root route, 200 status', (done) => {
        chai.request(server)
        .get('/')
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.eql({});
            done();
        });
    });

});
describe('Testing Account Setup', () => {
    it('[POST][/user/register] > creates the test account if one doesnt exist, 200/400 status', done => {
        chai.request(server)
        .post('/user/register')
        .set('msg', testPrefix)
        .send(testUser)
        .end((err, res) => {
            expect(err).to.be.null;
            if(res.statusCode === 200) {
                expect(res).to.have.status(200);
                expect(res.body).to.not.be.null;
                expect(res.body.userID).to.not.be.null;
                userID = res.body.userID.toString();
                done();
            }
            expect(res).to.have.status(400);
            done();
            
        });
    });
    it('[POST][/user/login] > logs in to the test account, 200 status', done => {
        chai
        .request(server)
        .post("/user/login")
        .set('msg', testPrefix)
        .send({email: testUser.email, password: testUser.password})
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            token = res.body;
            done();
        });
    });
    it('[DELETE][/user] > deletes the test account, 204 status', done => {
        chai.request(server)
        .delete('/user')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(204);
            done();
        });
    });
    it('[POST][/user/register] > creates the test account, 200 status', done => {
        chai.request(server)
        .post('/user/register')
        .set('msg', testPrefix)
        .send(testUser)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.not.be.null;
            expect(res.body.userID).to.not.be.null;
            userID = res.body.userID.toString();
            done();
        });
    });
});

describe('Account and Authentication Services', () => {
    // runs before each test in this block
    beforeEach(done => {
        chai
        .request(server)
        .post("/user/login")
        .set('msg', testPrefix)
        .send({email: (tempEmail !== 'init' ? tempEmail :testUser.email), password: testUser.password})
        .end((err, res) => {
            expect(err).to.be.null;
            token = res.body;
            expect(res).to.have.status(200);
            done();
        });
    });
    it('[POST][/user/register] > creates an account but is rejected, 400 status', done => {
        chai.request(server)
        .post('/user/register')
        .set('msg', testPrefix)
        .send(testUser)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(400);
            done();
        });
    });
    it('[GET][/user] > gets a users data, 200 status', done => {
        chai.request(server)
        .get('/user')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body.userData._id.toString()).to.eql(userID);
            expect(res.body.userData.firstName).to.eql('Tes')
            expect(res.body.userData.lastName).to.eql('Ter')
            expect(res.body.userData.phone).to.eql('0712345678')
            expect(res.body.userData.email).to.eql('test@test.com')
            done();
        });
    });
    it('[POST][/auth] > authenticates the auth token, 200 status', done => {
        chai.request(server)
        .post('/auth')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            done();
        });
    });
    
    it('[DELETE][/logout] > removes refresh token from db, 204 status', done => {
        chai.request(server)
        .delete('/logout')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(204);
            done();
        });
    });

    it('[POST][/auth] > should return a new auth token, 200 status', done => {
        chai.request(server)
        .post('/auth')
        .auth(`badtoken ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res.body).to.not.be.null;
            console.log(res.body);
            expect(res.body).to.not.eql({});
            expect(res.body.authToken).to.not.be.null;
            const tokenCheck = jwt.verify(res.body.authToken, jwtSecret, (err, data) => {
                if(err) console.log(JSON.stringify(err));
                if(err) return false;
                if(!data.id) return false;
                if(data.id.toString() !== userID) return false;
                return true;
            });
            expect(tokenCheck).to.be.true;
            expect(res).to.have.status(200);
            done();
        });
    });

    it('[POST][/user/name] > change the test accounts name, 200 status', done => {
        chai.request(server)
        .post('/user/name')
        .send({
            firstName: 'Tes', 
            lastName: 'Ti'
        })
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.not.be.null;
            expect(res.body).to.not.eql({});
            expect(res.body.firstName).to.not.be.null;
            expect(res.body.lastName).to.not.be.null;
            expect(res.body.firstName).to.eql('Tes');
            expect(res.body.lastName).to.eql('Ti');
            done();
        });
    });

    it('[POST][/user/email] > change the test accounts email, 400 status', done => {
        chai.request(server)
        .post('/user/email')
        .send({
            email: testUser.email,
        })
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(400);
            done();
        });
    });

    it('[POST][/user/email] > change the test accounts email, 200 status', done => {
        chai.request(server)
        .post('/user/email')
        .send({
            email: 'new@test.com',
        })
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.not.be.null;
            expect(res.body).to.not.eql({});
            expect(res.body.email).to.not.be.null;
            expect(res.body.email).to.eql('new@test.com');
            tempEmail = res.body.email;
            done();
        });
    });
    it('[POST][/user/email] > change the test accounts email, 200 status', done => {
        chai.request(server)
        .post('/user/email')
        .send({
            email: 'test@test.com',
        })
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.not.be.null;
            expect(res.body).to.not.eql({});
            expect(res.body.email).to.not.be.null;
            expect(res.body.email).to.eql('test@test.com');
            tempEmail = 'init';
            done();
        });
    });
    it('[POST][/user/password] > change the test accounts password with wrong current password, 403 status', done => {
        chai.request(server)
        .post('/user/password')
        .send({
            currentPassword: '123321123321123321123321',
            newPassword: testUser.password
        })
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(403);
            expect(res.body).to.not.be.null;
            expect(res.body).to.not.eql({});
            expect(res.body.error).to.not.be.null;
            expect(res.body.error).to.eql('Incorrect Password');
            done();
        });
    });
    it('[POST][/user/password] > change the test accounts password with wrong payload, 400 status', done => {
        chai.request(server)
        .post('/user/password')
        .send({
            currentPassword: '123321123321123321123321'
        })
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(400);
            expect(res.body).to.not.be.null;
            expect(res.body).to.not.eql({});
            expect(res.body.error).to.not.be.null;
            expect(res.body.error).to.eql('Please fill in all form fields');
            done();
        });
    });
});

describe('Appointment Data Services', () => {

    let appointmentId = "";
    let typeId = "";
    let hospitalId = '';

    beforeEach(done => {
        chai
        .request(server)
        .post("/user/login")
        .set('msg', testPrefix)
        .send({email: testUser.email, password: testUser.password})
        .end((err, res) => {
            expect(err).to.be.null;
            token = res.body;
            expect(res).to.have.status(200);
            done();
        });
    });
    it('[POST][/user/appointment/new] > create a test appointment, 200 status', done => {
        chai.request(server)
        .post('/user/appointment/new')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .send({
            type: 'BLOOD_TEST', 
            title: 'Test Appointment',
            number: '420',
            location: '6238588c6187b37cb7a32ffe',
            ward: '10',
            date: '2022-04-20',
            time: '04:20',
        })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body.msg).to.eql('Appointment Created');
            expect(res.body.appointmentId).to.not.be.null;
            if(res.body.appointmentId) appointmentId = res.body.appointmentId.toString();
            done();
        });
    });
    it('[DELETE][/user/appointment] > fails to deletes test appointment, 403 status', done => {
        chai.request(server)
        .delete('/user/appointment')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .send({
            appointmentId: '624040665c5334012ad18beb'
        })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(403);
            done();
        });
    });
    it('[POST][/appointment/type/new] > create a new appointment type, 200 status', done => {
        chai.request(server)
        .post('/appointment/type/new')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .send({
            title: 'Test Appointment Type',
            description: 'Test Description',
            identifier: 'TEST'
        })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body.msg).to.eql('Appointment Type Added');
            expect(res.body.typeId).to.not.be.null;
            if(res.body.typeId) typeId = res.body.typeId.toString();
            done();
        });
    });
    it('[DELETE][/appointment/type] > delete an appointment type, 204 status', done => {
        chai.request(server)
        .delete('/appointment/type')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .send({
            typeId: typeId
        })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(204);
            done();
        });
    });
    it('[GET][/user/appointments] > gets all of the test users appointments, 200 status', done => {
        chai.request(server)
        .get('/user/appointments')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.not.be.null;
            appointmentId = res.body[0]._id.toString();
            done();
        });
    });
    it('[POST][/user/appointment] > gets appointment by id, 200 status', done => {
        chai.request(server)
        .post('/user/appointment')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .send({
            appointmentId: appointmentId
        })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.not.be.null;
            expect(res.body.title).to.eql('Test Appointment');
            expect(res.body.location.name).to.eql('Glasgow Royal Infirmary');
            done();
        });
    });
    it('[DELETE][/user/appointment] > deletes test appointment, 204 status', done => {
        chai.request(server)
        .delete('/user/appointment')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .send({
            appointmentId: appointmentId
        })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(204);
            done();
        });
    });
    it('[GET][/appointment/type] > gets all of the appointment types, 200 status', done => {
        chai.request(server)
        .get('/appointment/type')
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.not.be.null;
            done();
        });
    });
    it('[GET][/hospitals] > gets all of the hospitals, 200 status', done => {
        chai.request(server)
        .get('/hospitals')
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.not.be.null;
            done();
        });
    });
    
    it('[POST][/hospital/new] > create a new appointment type, 200 status', done => {
        chai.request(server)
        .post('/hospital/new')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .send({
            name: 'Test Hospital', 
            address: 'Test Address', 
            postcode: 'Test Postcode', 
            number: 'Test Number',
            website: 'Test Website',
            parking: true,
            transport: 'Test Transport',
            description: 'Test Description',
            identifier: 'TEST',
            mapHTML: 'Test Map HTML'
        })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body.msg).to.eql('Hospital Added');
            expect(res.body.hospitalId).to.not.be.null;
            if(res.body.hospitalId) hospitalId = res.body.hospitalId.toString();
            done();
        });
    });
    it('[DELETE][/hospital]] > delete a hospital, 204 status', done => {
        chai.request(server)
        .delete('/hospital')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .send({
            hospitalId: hospitalId
        })
        .set('msg', testPrefix)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(204);
            done();
        });
    });
});