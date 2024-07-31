const { google } = require('googleapis');
const { Bannerbear } = require('bannerbear');

const GOOGLE_API = 'your_google_api_key';
const SHEET_ID = 'your_google_sheet_id';
const SHEET_RANGE = 'Sheet1!1:1000';
const FOLDER_ID = 'your_google_drive_folder_id';

const BANNERBEAR_API = 'your_bannerbear_api_key';
const TEMPLATE_ID = 'your_bannerbear_template_id';

async function getSheetData() {
  try {
    const sheets = google.sheets({ version: 'v4', auth: GOOGLE_API });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
    });
    console.log(response.data.values)
    const rows = response.data.values;
    return rows.slice(1);
  } catch (err) {
    console.error('Error:', err);
  }
}

async function getImageFiles() {
  try {
    const drive = google.drive({ version: 'v3', auth: GOOGLE_API });
    const response = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and mimeType contains 'image/'`,
      fields: 'files(id, name)',
    });
    console.log(response.data.files)
    return response.data.files;
  } catch (err) {
    console.error('Error:', err);
  }
}

(async () => {
  const bb = new Bannerbear(BANNERBEAR_API);
  
  const panelObj = await getSheetData();
  const imageFiles = await getImageFiles();
  const imagesObj = {};
  imageFiles.forEach((image) => {
    imagesObj[image.name.split('.')[0]] = `https://drive.google.com/uc?id=${image.id}`;
    fetch(imagesObj[image.name.split('.')[0]]);
  });


  panelObj.forEach(async (item) => {
    const images = await bb.create_image(
      TEMPLATE_ID,
      {
        modifications: [
          {
            name: 'text_name',
            text: item[0],
          },
          {
            name: 'event_role',
            text: item[1],
          },
          {
            name: 'image_container',
            image_url: imagesObj[item[0]],
          }
        ],
      },
      true
    );

    const imageUrl = images.image_url;
    console.log(imageUrl);
  });
})();
