const path = require('path');
const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const fs = require('fs');
let ues = require('./data.json');
const ue1Routes = require('./src/ue1');
const ue2Routes = require('./src/ue2');
const ue3Routes = require('./src/ue3');

const app = express();
const memoryStore = new session.MemoryStore();

// exporter memoryStore pour pouvoir l'utiliser dans ue1.js
module.exports.memoryStore = memoryStore;

app.set('view engine', 'ejs');
app.set('views', './view');
// rajouter les 2 lignes suivantes pour gérer du post]
app.use(express.static('static'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'KWhjV<T=-*VW<;cC5Y6U-{F.ppK+])Ub',
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
}));

const keycloak = new Keycloak({
    store: memoryStore,
});


app.use(keycloak.middleware({
    logout: '/logout',
    admin: '/',
}));

module.exports = keycloak;


app.get('/', (req, res) => res.redirect('/home'));

const parseToken = raw => {
    if (!raw || typeof raw !== 'string') return null;

    try {
        raw = JSON.parse(raw);
        const token = raw.id_token ? raw.id_token : raw.access_token;
        const content = token.split('.')[1];
        return JSON.parse(Buffer.from(content, 'base64').toString('utf-8'));
    } catch (e) {
        console.error('Error while parsing token: ', e);
    }
};

app.get('/home', keycloak.protect(), (req, res, next) => {
    try {
        const details = parseToken(req.session['keycloak-token']);
        const embedded_params = {};

        if (details) {
            embedded_params.name = details.name;
            embedded_params.email = details.email;
            embedded_params.username = details.preferred_username;
            embedded_params.roles = details.roles; // récupération des rôles
            // suppression des rôles non utilisés qui sont default-roles-tp-application, offline_access, 
            // uma_authorization
            embedded_params.roles = embedded_params.roles.filter(role => role !== 'default-roles-tp-application' 
                            && role !== 'offline_access' && role !== 'uma_authorization');
        }

        // ne récupérer que les id et nom des ues
        const uesHome = ues.map(ue => {
            return {
                id: ue.id,
                name: ue.nom
            }
        });

        res.render('home', {
            user: embedded_params,
            ues: uesHome
        });
    } catch (error) {
        console.error('Error in /home route: ', error);
        // Envoyez le code d'erreur approprié et affichez la page d'erreur
        res.status(500).send({ error: 'Une erreur interne est survenue.' });
    }
});


app.get('/login', keycloak.protect(), (req, res) => {
    return res.redirect('home');
});

app.use('/ue1', ue1Routes);
app.use('/ue2', ue2Routes);
app.use('/ue3', ue3Routes);

app.use((err, req, res, next) => {
    if (err.status === 404) {
        res.status(404).send(`<script>alert("Not Found."); window.history.back();</script>`);
    } else if (err.status === 403) {
        res.status(403).send(`<script>alert("Accès refusé."); window.history.back();</script>`);
    } else {
        // Passez les autres erreurs au prochain gestionnaire d'erreurs
        next(err);
    }
});

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// une gestion des erreurs, on evite l'échappement des caractères avec la fonction précédente
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    const errorMessage = escapeHtml(err.message) || 'Une erreur interne est survenue.';
    
    // Pour les autres types de requêtes, envoyez un script d'alerte
    res.status(statusCode).send(`<script>alert("${errorMessage}"); window.history.back();</script>`);
});

const server = app.listen(3000, '127.0.0.1', () => {
    const host = server.address().address;
    const port = server.address().port;

    console.log('Application running at http://%s:%s', host, port);
});
