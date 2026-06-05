// Store para tarefas operacionais (Kanban COO) usando GitHub como banco
const githubStore = require('../store/githubStore');

const STORAGE_KEY = 'dl_api_ops_tasks_v1';

async function _readOpsTasks() {
  const res = await githubStore.getStorage(STORAGE_KEY, []);
  return Array.isArray(res) ? res : [];
}

async function _writeOpsTasks(tasks, message) {
  return githubStore.setStorage(STORAGE_KEY, tasks, message || 'Update ops tasks');
}

async function getOpsTasks() {
  return await _readOpsTasks();
}

async function addOpsTask(task) {
  const tasks = await _readOpsTasks();
  const newTask = Object.assign({ id: Date.now(), createdAt: new Date().toISOString() }, task);
  tasks.push(newTask);
  await _writeOpsTasks(tasks, `Add ops task ${newTask.id}`);
  return newTask;
}

async function updateOpsTask(id, updates) {
  const tasks = await _readOpsTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) throw new Error('Task not found');
  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
  await _writeOpsTasks(tasks, `Update ops task ${id}`);
  return tasks[idx];
}

async function deleteOpsTask(id) {
  const tasks = await _readOpsTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) throw new Error('Task not found');
  const [removed] = tasks.splice(idx, 1);
  await _writeOpsTasks(tasks, `Delete ops task ${id}`);
  return removed;
}

module.exports = {
  getOpsTasks,
  addOpsTask,
  updateOpsTask,
  deleteOpsTask,
};
