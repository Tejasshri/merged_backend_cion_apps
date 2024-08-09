// function buildFolderTree(folders) {
//   // Step 1: Create a map for folder lookup by ID
//   const folderMap = new Map();
//   folders.forEach((folder) => {
//     folderMap.set(folder.id, {
//       name: folder.name,
//       files: folder.files || [], // Initialize files array
//       insideFolder: [], // Changed from insider to insideFolder
//     });
//   });

//   // Step 2: Build the tree structure
//   folders.forEach((folder) => {
//     const currentFolder = folderMap.get(folder.id);
//     if (folder.parent_folder_id !== null) {
//       const parentFolder = folderMap.get(folder.parent_folder_id);
//       if (parentFolder) {
//         parentFolder.insideFolder.push(currentFolder); // Changed from insider to insideFolder
//       }
//     }
//   });

//   // Step 3: Extract root folders
//   const rootFolders = [];
//   folderMap.forEach((folder, id) => {
//     if (!folders.find((f) => f.id === id && f.parent_folder_id !== null)) {
//       rootFolders.push(folder);
//     }
//   });

//   return rootFolders;
// }

function buildFolderTree(folders, files=[]) {
  // Step 1: Create a map for folder lookup by ID
  const folderMap = new Map();
  folders.forEach((folder) => {
    folderMap.set(folder.id, {
      name: folder.name,
      files: [], // Initialize files array
      insideFolder: [], // Changed from insider to insideFolder
    });
  });

  // Step 2: Build the tree structure and add files to the respective folders
  folders.forEach((folder) => {
    const currentFolder = folderMap.get(folder.id);
    if (folder.parent_folder_id !== null) {
      const parentFolder = folderMap.get(folder.parent_folder_id);
      if (parentFolder) {
        parentFolder.insideFolder.push(currentFolder); // Changed from insider to insideFolder
      }
    }
  });

  // Add files to the respective folders
  files.forEach((file) => {
    const folder = folderMap.get(file.folder_id);
    if (folder) {
      folder.files.push(file);
    }
  });

  // Step 3: Extract root folders
  const rootFolders = [];
  folderMap.forEach((folder, id) => {
    if (
      ![...folderMap.values()].some((parentFolder) =>
        parentFolder.insideFolder.includes(folder)
      )
    ) {
      rootFolders.push(folder);
    }
  });

  return rootFolders;
}

module.exports = buildFolderTree;
