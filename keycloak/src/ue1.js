const express = require('express');
const router = express.Router();
const fs = require('fs');
const ues = require('../data.json');
const Keycloak = require('keycloak-connect');
const memoryStore = require('../index');
const { saveUesToFile } = require('../utils');

const keycloak = new Keycloak({
    store: memoryStore,
});

/**
 * Route GET pour afficher la page d'accueil de l'UE1.
 * 
 * @param {Object} req - L'objet de requête Express, contenant les informations de la requête.
 * @param {Object} res - L'objet de réponse Express.
 * @param {function} next - La fonction middleware suivante dans la pile Express.
 */
router.get('/', keycloak.enforcer(['ue1:read']), (req, res, next) => {
    try {
        // Trouvez les données de l'UE1 dans votre fichier JSON ou base de données
        const ue1 = ues.find(ue => ue.id === 'ue1');
        if (!ue1) {
            let error = new Error('UE1 non trouvée');
            error.status = 404;
            throw error;
        }
        res.render('ue', { ue: ue1 });        
    } catch (error) {
        next(error);
    }
});

/**
 * Route POST pour écrire/modifier une note d'un étudiant pour l'UE1.
 * 
 * @param {Object} req - L'objet de requête Express, contenant les informations de la requête.
 * @param {string} req.body.studentName - Le nom de l'étudiant pour lequel la note doit être modifiée.
 * @param {number} req.body.newNote - La nouvelle note de l'étudiant.
 * @param {Object} res - L'objet de réponse Express.
 * @param {function} next - La fonction middleware suivante dans la pile Express.
 */
router.post('/write', keycloak.enforcer(['ue1:write']), (req, res, next) => {
    const studentName = req.body.studentName;
    const newNote = req.body.newNote;
    let ue = ues.find(ue => ue.id === 'ue1');

    let studentNote = ue.notes.find(note => note.nom === studentName);
    if (studentNote) {
        studentNote.note = +newNote; // Convertit newNote en nombre si ce n'est pas déjà un nombre
    } else {
        // create a new note if the student is not found : used for create a new note for a new student
        ue.notes.push({
            nom: studentName,
            note: +newNote,
            isValidated: false,
        });
    }

    // permet de modifier notre base de données simulée par un fichier json
    saveUesToFile((error, status) => {
        if (error) {
            next(error)
        }
    });

    res.redirect('/ue1');
    res.status(200).end('success');
});

/**
 * Route POST pour valider la note d'un étudiant pour l'UE1.
 * 
 * @param {Object} req - L'objet de requête Express, contenant les informations de la requête.
 * @param {string} req.body.studentName - Le nom de l'étudiant pour lequel la note doit être validée.
 * @param {Object} res - L'objet de réponse Express.
 * @param {function} next - La fonction middleware suivante dans la pile Express.
 */
router.post('/validate', keycloak.enforcer(['ue1:validate']), (req, res, next) => {
    const studentName = req.body.studentName;
    let ue = ues.find(ue => ue.id === 'ue1');

    let studentNote = ue.notes.find(note => note.nom === studentName);
    if (studentNote) {
        studentNote.isValidated = true;
    } else {
        // Renvoyer une erreur si l'étudiant n'est pas trouvé
        return res.status(404).send('Student not found');
    }

    // permet de modifier notre base de données simulée par un fichier json
    saveUesToFile((error, status) => {
        if (error) {
            return res.status(status).send(error);
        }
    });

    // Rediriger l'utilisateur vers la page /ue1 après la validation
    res.redirect('/ue1');
    res.status(200).end('success');
});

/**
 * Route POST pour supprimer la note d'un étudiant pour l'UE1.
 * 
 * @param {Object} req - L'objet de requête Express, contenant les informations de la requête.
 * @param {string} req.body.studentName - Le nom de l'étudiant pour lequel la note doit être supprimée.
 * @param {Object} res - L'objet de réponse Express.
 * @param {function} next - La fonction middleware suivante dans la pile Express.
 */
router.post('/delete', keycloak.enforcer(['ue1:write']), (req, res, next) => {
    const studentName = req.body.studentName;
    let ue = ues.find(ue => ue.id === 'ue1');

    let studentNote = ue.notes.find(note => note.nom === studentName);
    if (studentNote) {
        ue.notes.splice(ue.notes.indexOf(studentNote), 1);
    } else {
        // Renvoyer une erreur si l'étudiant n'est pas trouvé
        return res.status(404).send('Student not found');
    }

    // permet de modifier notre base de données simulée par un fichier json
    saveUesToFile((error, status) => {
        if (error) {
            return res.status(status).send(error);
        }
    });

    // Rediriger l'utilisateur vers la page /ue1 après la validation
    res.redirect('/ue1');
    res.status(200).end('success');
});

module.exports = router;
