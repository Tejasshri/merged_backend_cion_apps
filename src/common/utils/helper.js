const addTimestamps = (document) => {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  document.timestamp = nowInSeconds.toString();
  return document;
};

exports.addTimestamps = addTimestamps;
