module.exports = {

  invertCanvasData: function(data, rowCount){
    let newData = {};
    for (let colKey in data){
      newData[colKey] = {};
      for (let rowKey in data[colKey]){
        newData[colKey][rowCount - 1 - parseInt(rowKey)] = data[colKey][rowKey];
      }
    }
    return newData;
  }


}
