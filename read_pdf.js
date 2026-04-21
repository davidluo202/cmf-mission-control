const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('./机构客户开户流程设计方案.pdf');

pdf.default ? pdf.default(dataBuffer).then(data => console.log(data.text)) : pdf(dataBuffer).then(data => console.log(data.text));
