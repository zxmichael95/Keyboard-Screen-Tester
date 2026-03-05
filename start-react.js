const { exec } = require('child_process');

// Set the BROWSER environment variable to 'none'
process.env.BROWSER = 'none';

// Run the 'react-scripts start' command
const child = exec('react-scripts start');

// Pipe the output of the child process to our main process
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);