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
    it('[GET][/] > should respond  with a 200 status', (done) => {
        chai.request(server)
        .get('/')
        .set('msg', '[Test]')
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
        .set('msg', '[Test][Auto]')
        .send({email: testUser.email, password: testUser.password})
        .end((err, res) => {
            expect(err).to.be.null;
            token = res.body;
            expect(res).to.have.status(200);
            done();
        });
    });
    it('[POST][/user/register] > attempts to create an account but is rejected', done => {
        chai.request(server)
        .post('/user/register')
        .set('msg', '[Test]')
        .send(testUser)
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(400);
            done();
        });
    });
    it('[POST][/auth] > should respond with a 200 status', done => {
        chai.request(server)
        .post('/auth')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', '[Test][1]')
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            done();
        });
    });
    
    it('[DELETE][/logout] > should respond with a 204 status', done => {
        chai.request(server)
        .delete('/logout')
        .auth(`${token.Atoken} ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', '[Test][Logout]')
        .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(204);
            done();
        });
    });

    it('[POST][/auth] > should return a new auth token with 200 status', done => {
        chai.request(server)
        .post('/auth')
        .auth(`badtoken ${token.Rtoken}`, { type: 'bearer' })
        .set('msg', '[Test][2]')
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

describe('Appointment Services', () => {
    // runs before each test in this block
    // beforeEach(done => {
    //     chai
    //     .request(server)
    //     .post("/user/login")
    //     .set('msg', '[Test][Appointment][Auto]')
    //     .send({email: testUser.email, password: testUser.password})
    //     .end((err, res) => {
    //         expect(err).to.be.null;
    //         token = res.body;
    //         expect(res).to.have.status(200);
    //         done();
    //     });
    // });
    // it('[POST][/user/appointment/new] > create a new appoint ment with a status of 200', done => {
    //     chai.request(server)
    //     .post('/user/appointment/new')
    //     .auth(`badtoken ${token.Rtoken}`, { type: 'bearer' })
    //     .send({
    //         type: 'BLOOD_TEST', 
    //         title: 'Test Appointment',
    //         number: '420',
    //         location: '6238588c6187b37cb7a32ffe',
    //         ward: '10',
    //         date: '2022-04-20',
    //         time: '04:20',
    //     })
    //     .set('msg', '[Test][Appointment]')
    //     .end((err, res) => {
    //         expect(err).to.be.null;
    //         expect(res).to.have.status(200);
    //         done();
    //     });
    // });
    
});