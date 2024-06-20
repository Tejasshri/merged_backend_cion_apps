
// Creating_User_Table 
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT, 
    email TEXT NOT NULL, 
    password TEXT NOT NULL, 
    username TEXT NOT NULL, 
    role_id INT DEFAULT 4, 
    area TEXT,
    department TEXT,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE
);

// Filtered_Data 
SELECT 
	roles.id, roles.name as role, roles_capability.capability_id, 
    capability.name AS capability_name, feature_capability.permissions, 
    features.name AS feature
FROM 
	((((roles INNER JOIN roles_capability ON roles.id = roles_capability.role_id)
    INNER JOIN capability ON capability.id = roles_capability.capability_id)) 
    INNER JOIN feature_capability ON roles_capability.capability_id = feature_capability.capability_id)
    INNER JOIN features ON feature_capability.feature_id = features.id     
ORDER BY role_id ;


CREATE TABLE roles (
	id INT PRIMARY KEY AUTO_INCREMENT, 
    name  TEXT PRIMARY KEY
); 

CREATE TABLE capability (
	id INT PRIMARY KEY AUTO_INCREMENT, 
    name TEXT
);

CREATE TABLE features (
	id INT PRIMARY KEY AUTO_INCREMENT, 
    name TEXT
);

CREATE TABLE feature_capability (
	id INT PRIMARY KEY AUTO_INCREMENT, 
    feature_id INT, 
    capability_id INT, 
    permissions VARCHAR(5) ,
	FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE ON UPDATE CASCADE, 
    FOREIGN KEY (capability_id) REFERENCES capability(id) ON DELETE CASCADE ON UPDATE CASCADE 
);

CREATE TABLE roles_capability(
	id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL, 
    capability_id INT NOT NULL, 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE, 
    FOREIGN KEY (capability_id) REFERENCES capability(id) ON DELETE CASCADE ON UPDATE CASCADE
);
