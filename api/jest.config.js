module.exports = {
    "moduleFileExtensions": [
      "js",
      "json"
    ],
    "preset": "@shelf/jest-mongodb",
    "transform": {
      "^.+\\.(js)?$": "babel-jest"
    },
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/src/$1"
    },
    "testPathIgnorePatterns": [
      "node_modules",
      ".cache"
    ] 
  };