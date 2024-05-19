const OBJECT_STORE = 'barcodes';

const doRequest = (success, error) => {
  const request = indexedDB.open('db', 1);
  request.onupgradeneeded = ({target: { result: db }}) => {
    const objectStore = db.createObjectStore(OBJECT_STORE, {keyPath: 'id'});
    objectStore.createIndex('rawData', 'rawData', {unique: true});
    objectStore.createIndex('format', 'format', {unique: false});    
  };
  request.onsuccess = success;
  request.onerror = error;
}

export const insertOne = ({id, rawValue, format}) => {
  return new Promise((resolve, reject) => {
    doRequest(({target: { result: db }}) => {
      const transaction = db.transaction(OBJECT_STORE, 'readwrite');
      const objectStore = transaction.objectStore(OBJECT_STORE);
      objectStore.add({ id, format, rawValue });
      transaction.oncomplete = resolve;
    }, ({target: { error }}) => reject(error))
  })
};
export const deleteOne = (id) => {
  return new Promise((resolve, reject) => {
    doRequest(({target: { result: db }}) => {
      const transaction = db.transaction(OBJECT_STORE, 'readwrite');
      const objectStore = transaction.objectStore(OBJECT_STORE);
      const deleteRequest = objectStore.delete(id);
      deleteRequest.onsuccess = resolve;
      deleteRequest.onerror = ({target: { error }}) => reject(error);
      transaction.oncomplete = () => {
        console.log('transaction completed');
      }
    }, ({target: { error }}) => reject(error))
  });
}
export const updateOne = (id, newData) => {
  return new Promise((resolve, reject) => {
    doRequest(({target: { result: db}}) => {
      const transaction = db.transaction(OBJECT_STORE, 'readwrite');
      const objectStore = transaction.objectStore(OBJECT_STORE);
      const getRequest = objectStore.get(id);
      getRequest.onsuccess = ({ target: { result: existingRecord }}) => {
        if(existingRecord) {
          const updatedRecord = {...existingRecord, ...newData};
          const putRequest = objectStore.put(updatedRecord);
          putRequest.onsuccess = resolve;
          putRequest.onerror = ({target: { error }}) => reject(error);
        } else {
          reject(new Error('Record not found.'));
        }
      };
      getRequest.onerror = ({ target: { error }}) => reject(error);
      transaction.oncomplete = () => console.log('transaction completed');
    }, ({target: { error }}) => reject(error));
  });
}
export const hasValue = (key, value) => {
  return new Promise((resolve, reject) => {
    doRequest(({target: { result: db}}) => {
      const transaction = db.transaction(OBJECT_STORE, 'readonly');
      const objectStore = transaction.objectStore(OBJECT_STORE);
      const cursorRequest = objectStore.openCursor();
      const data = [];
      cursorRequest.onsuccess = ({target: { result: cursor}}) => {
        if (cursor) {
          if(cursor.value[key] === value) {
            resolve(true);
            return;
          }
          cursor.continue();
        } else {
          resolve(false);
        }
      };
      cursorRequest.onerror =  ({target: { error }}) => reject(error);
      transaction.oncomplete = () => console.log('transaction completed');
    }, ({target: { error }}) => reject(error));
  });
}
export const nextId = () => {
  return new Promise((resolve, reject) => {
    doRequest(({target: { result: db}}) => {
      const transaction = db.transaction(OBJECT_STORE, 'readonly');
      const objectStore = transaction.objectStore(OBJECT_STORE);
      const getAllKeysRequest = objectStore.getAllKeys();
      getAllKeysRequest.onsuccess = ({target: { result: keys}}) => {
        if (keys.length === 0) {
          resolve(1);
        } else {
          const max = keys.reduce((max, id) => max > id ? max : id, 0);
          resolve(max + 1);
        }
      };
      getAllKeysRequest.onerror = ({target: { error }}) => reject(error);
      transaction.oncomplete = () => console.log('transaction completed');
    }, ({target: { error }}) => reject(error));
  });
}
export const selectOne = (id) => {
  return new Promise((resolve, reject) => {
    doRequest(({target: { result: db}}) => {
      const transaction = db.transaction(OBJECT_STORE, 'readonly');
      const objectStore = transaction.objectStore(OBJECT_STORE);
      const getRequest = objectStore.get(id);
      getRequest.onsuccess = ({target: { result: record}}) => {
        if (record) {
          resolve(record);
        } else {
          resolve(null);
        }
      };
      transaction.oncomplete = () => console.log('transaction completed');
    }, ({target: { error }}) => reject(error));
  });
}
export const selectAll = () => {
  return new Promise((resolve, reject) => {
    doRequest(({target: { result: db}}) => {
      const transaction = db.transaction(OBJECT_STORE, 'readonly');
      const objectStore = transaction.objectStore(OBJECT_STORE);
      const cursorRequest = objectStore.openCursor();
      const data = [];
      cursorRequest.onsuccess = ({target: { result: cursor}}) => {
        if (cursor) {
          data.push(cursor.value);
          cursor.continue();
        } else {
          transaction.complete;
          resolve(data);
        }
      };
      cursorRequest.onerror =  ({target: { error }}) => reject(error);
      transaction.oncomplete = () => console.log('transaction completed');
    }, ({target: { error }}) => reject(error));
  });
}