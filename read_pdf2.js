const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('/Users/davidluo-bot/.openclaw/workspace-cmfcoding/docs/项目设计/诚港金融开户系统/CMF002_机构客户资料表_Customer_Information_Form_Corporate.pdf');

pdf.default ? pdf.default(dataBuffer).then(data => console.log(data.text)) : pdf(dataBuffer).then(data => console.log(data.text));
