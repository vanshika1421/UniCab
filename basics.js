// Node.js Basics Example
// Run this file with: node basics.js

console.log('Hello from Node.js!');
console.log('Process ID:', process.pid);
console.log('Node.js Version:', process.version);
console.log('Platform:', process.platform);

// Demonstrate asynchronous behavior
setTimeout(() => {
  console.log('This message is shown after 1 second (async)!');
}, 1000);
