const bcrypt = require('bcryptjs');
const github = require('../githubClient');

// Caminhos dos arquivos no repositório
const USERS_PATH = 'data/users.json';
const CLIENTS_PATH = 'data/clients.json';
const FILES_PATH = 'data/files.json';
const PROJECTS_PATH = 'data/projects.json';
// Projetos
async function _readProjects() {
  const res = await github.getJson(PROJECTS_PATH);
  return (res && res.json) ? res.json : [];
}
async function _writeProjects(projects, message) {
  return github.createOrUpdateJson(PROJECTS_PATH, projects, message || 'Update projects');
}
async function addProject(project) {
  const projects = await _readProjects();
  const newProject = Object.assign({ id: Date.now(), createdAt: new Date().toISOString() }, project);
  projects.push(newProject);
  await _writeProjects(projects, `Add project ${newProject.id}`);
  return newProject;
}
async function getProjects() {
  return await _readProjects();
}

// Usuários
async function _readUsers() {
  const res = await github.getJson(USERS_PATH);
  return (res && res.json) ? res.json : [];
}
async function _writeUsers(users, message) {
  return github.createOrUpdateJson(USERS_PATH, users, message || 'Update users');
}
async function getUserByEmailAndRole(email, role) {
  const users = await _readUsers();
  return users.find(u => u.email === email && u.role === role) || null;
}
async function createUser({ email, password, role, name = null, avatar = null }) {
  const users = await _readUsers();
  const exists = users.find(u => u.email === email && u.role === role);
  if (exists) throw new Error('User already exists');
  const hashed = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now(), email, password: hashed, role, name, avatar, createdAt: new Date().toISOString() };
  users.push(newUser);
  await _writeUsers(users, `Create user ${email}`);
  return newUser;
}

// Clientes
async function _readClients() {
  const res = await github.getJson(CLIENTS_PATH);
  return (res && res.json) ? res.json : [];
}
async function _writeClients(clients, message) {
  return github.createOrUpdateJson(CLIENTS_PATH, clients, message || 'Update clients');
}
async function addClient(client) {
  const clients = await _readClients();
  const newClient = Object.assign({ id: Date.now(), createdAt: new Date().toISOString() }, client);
  clients.push(newClient);
  await _writeClients(clients, `Add client ${newClient.id}`);
  return newClient;
}
async function getClients() {
  return await _readClients();
}

// Arquivos (metadados)
async function _readFiles() {
  const res = await github.getJson(FILES_PATH);
  return (res && res.json) ? res.json : [];
}
async function _writeFiles(files, message) {
  return github.createOrUpdateJson(FILES_PATH, files, message || 'Update files');
}
async function addFile(meta) {
  const files = await _readFiles();
  const newFile = Object.assign({ id: Date.now(), createdAt: new Date().toISOString() }, meta);
  files.push(newFile);
  await _writeFiles(files, `Add file ${newFile.id}`);
  return newFile;
}
async function getFiles() {
  return await _readFiles();
}

module.exports = {
  getUserByEmailAndRole,
  createUser,
  addClient,
  getClients,
  addFile,
  getFiles,
  addProject,
  getProjects,
};
