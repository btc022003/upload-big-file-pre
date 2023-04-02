const express = require('express');
const multiparty = require('multiparty');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

app.use('/', express.static('./public'));

// 接受切片
app.post('/upload_file_thunk', (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, (err, fields, files) => {
    if (err) {
      res.json({
        code: 0,
        data: {},
      });
    } else {
      fs.mkdirSync('./public/uploads/thunk/' + fields['filename'][0], {
        recursive: true,
      }); // 把每一次上传的切片数据进行统一的存储
      // 转存
      fs.renameSync(
        files['chunk'][0].path,
        './public/uploads/thunk/' +
          fields['filename'][0] +
          '/' +
          fields['name'][0]
      );
      res.json({
        code: 1,
        data: '上传切片成功',
      });
    }
  });
});

/**
 * 文件合并
 * @param {*} sourceFiles 源文件
 * @param {*} targetFile  目标文件
 */
function thunkStreamMerge(sourceFiles, targetFile) {
  const thunkFilesDir = sourceFiles;
  const list = fs.readdirSync(thunkFilesDir); // 读取目录中的文件

  const fileList = list
    .sort((a, b) => a.split('@')[1] * 1 - b.split('@')[1] * 1)
    .map((name) => ({
      name,
      filePath: path.resolve(thunkFilesDir, name),
    }));
  const fileWriteStream = fs.createWriteStream(targetFile);
  thunkStreamMergeProgress(fileList, fileWriteStream, sourceFiles);
}

/**
 * 合并每一个切片
 * @param {*} fileList        文件数据
 * @param {*} fileWriteStream 最终的写入结果
 * @param {*} sourceFiles     文件路径
 */
function thunkStreamMergeProgress(fileList, fileWriteStream, sourceFiles) {
  if (!fileList.length) {
    // thunkStreamMergeProgress(fileList)
    fileWriteStream.end('完成了');
    // 删除临时目录
    if (sourceFiles)
      fs.rmdirSync(sourceFiles, { recursive: true, force: true });
    return;
  }
  const data = fileList.shift(); // 取第一个数据
  const { filePath: chunkFilePath } = data;
  const currentReadStream = fs.createReadStream(chunkFilePath); // 读取文件
  // 把结果往最终的生成文件上进行拼接
  currentReadStream.pipe(fileWriteStream, { end: false });
  currentReadStream.on('end', () => {
    // console.log(chunkFilePath);
    // 拼接完之后进入下一次循环
    thunkStreamMergeProgress(fileList, fileWriteStream, sourceFiles);
  });
}

// 合并切片
app.post('/upload_thunk_end', (req, res) => {
  const fileName = req.body.filename;
  const extName = req.body.extname;
  thunkStreamMerge(
    './public/uploads/thunk/' + fileName,
    './public/uploads/' + fileName + '.' + extName
  );
  res.json({
    code: 1,
    data: '/public/uploads/' + fileName + '.' + extName,
  });
});

app.listen(3003, () => console.log('服务器运行在3003端口'));
