-- Active: 1694381072353@@192.168.1.200@3306@galeria
CREATE TABLE users(  
    id int(10) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    full_name varchar(100) NOT NULL,
    email varchar(400) NOT NULL UNIQUE,
    username varchar(50) NOT NULL UNIQUE,
    pass_user varchar(60) NOT NULL,
    image_user_50x50 varchar(100) NOT NULL,
    image_user_300x300 varchar(100) NOT NULL 
);

CREATE TABLE whiteList(
    id int(10) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    create_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refresh_token varchar(255) NOT NULL UNIQUE,
    access_token varchar(255) NOT NULL UNIQUE,
    user_id int(10) NOT NULL
)

ALTER TABLE `whiteList`
ADD CONSTRAINT `user_id fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE