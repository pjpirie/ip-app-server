/* eslint-disable no-unused-expressions */
const chai = require('chai'); 
let expect = chai.expect;

const chaiHttp = require('chai-http');
let server = 'http://localhost:5000';

chai.use(chaiHttp);

require('dotenv').config();
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;

const testUser = {
    first_name: "Tes",
    last_name: "Ter",
    email: 'test@test.com',
    password: 'test',
    phone: '0712345678'
}

let token = {};

describe('Server Responding', () => {
    it('[GET][/] > Ping root route, 200 status', (done) => {
        chai.request(server)
        .get('/')
        .set('msg', '[Test]>')
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.eql({});
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
        .set('msg', '[Test]-')
        .send({email: testUser.email, password: testUser.password})
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
        .set('msg', '[Test]>')
        .send(testUser)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(400);
            done();
        });
    });
    it('[POST][/auth] > authenticates the auth token, 200 status', done => {
        chai.request(server)
        .post('/auth')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', '[Test]>')
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
        .set('msg', '[Test]>')
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
        .set('msg', '[Test]>')
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res.body).to.not.be.null;
            expect(res.body).to.not.eql({});
            expect(res.body.authToken).to.not.be.null;
            const tokenCheck = jwt.verify(res.body.authToken, jwtSecret, (err, data) => {
                if(err) console.log(JSON.stringify(err));
                if(err) return false;
                if(!data.id) return false;
                if(data.id.toString() !== "623f93f82d01e5091eb308fd") return false;
                return true;
            });
            expect(tokenCheck).to.be.true;
            expect(res).to.have.status(200);
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
        .set('msg', '[Test]-')
        .send({email: testUser.email, password: testUser.password})
        .end((err, res) => {
            expect(err).to.be.null;
            token = res.body;
            expect(res).to.have.status(200);
            done();
        });
    });
    it('[POST][/user/appointment/new] > create a new appointment, 200 status', done => {
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
        .set('msg', '[Test]>')
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body.msg).to.eql('Appointment Created');
            expect(res.body.appointmentId).to.not.be.null;
            if(res.body.appointmentId) appointmentId = res.body.appointmentId.toString();
            done();
        });
    });
    it('[DELETE][/user/appointment] > delete an appointment, 204 status', done => {
        chai.request(server)
        .delete('/user/appointment')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .send({
            appointmentId: appointmentId
        })
        .set('msg', '[Test]>')
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(204);
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
        .set('msg', '[Test]>')
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
        .set('msg', '[Test]>')
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
        .set('msg', '[Test]>')
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
        .set('msg', '[Test]>')
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.not.be.null;
            expect(res.body[0].title).to.eql('Test Appointment');
            expect(res.body[0].location.name).to.eql('Glasgow Royal Infirmary');
            done();
        });
    });
    
    it('[GET][/appointment/type] > gets all of the appointment types, 200 status', done => {
        chai.request(server)
        .get('/appointment/type')
        .set('msg', '[Test]>')
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
        .set('msg', '[Test]>')
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
            mapHTML: 'Test Map HTML'
        })
        .set('msg', '[Test]>')
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
        .set('msg', '[Test]>')
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(204);
            done();
        });
    });
});