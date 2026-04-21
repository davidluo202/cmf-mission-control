const parser = require('docx-parser');
parser.parseDocx('/Users/davidluo-bot/.openclaw/workspace-cmfcoding/docs/项目设计/诚港金融开户系统/CMF003_机构客户开户申请表_Corporate_Account_Opening_Form.docx', function(data){
    console.log(data)
})