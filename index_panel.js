const { google } = require('googleapis');
const { Bannerbear } = require('bannerbear');

const GOOGLE_API = 'your_google_api_key';
const SHEET_ID = 'your_google_sheet_id';
const SHEET_RANGE = 'Sheet2!1:1000';
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
    let rows = response.data.values;
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
      fields: 'files(id, name, mimeType, webContentLink)',
    });
    return response.data.files;
  } catch (err) {
    console.error('Error:', err);
  }
}

function transformAndGroupArray(arr) {
  const result = [];
  let previous = {};

  function addEntry(date, topic, moderator, panelistName, panelistTitle) {
    const key = `${date}|${topic}|${moderator}`;
    const existing = result.find((entry) => entry.key === key);

    if (existing) {
      existing.panelists.push({ panelist_name: panelistName, panelist_title: panelistTitle });
    } else {
      result.push({
        key,
        date,
        topic: topic,
        moderator,
        panelists: [{ panelist_name: panelistName, panelist_title: panelistTitle }],
      });
    }
  }

  arr.forEach((subArray) => {
    if (subArray[0] === '') {
      addEntry(previous.date, previous.topic, previous.moderator, subArray[3], subArray[4]);
    } else {
      previous = {
        date: subArray[0],
        topic: subArray[1],
        moderator: subArray[2],
        panelist_name: subArray[3],
        panelist_title: subArray[4],
      };
      addEntry(previous.date, previous.topic, previous.moderator, previous.panelist_name, previous.panelist_title);
    }
  });

  // Remove duplicate 'key' property
  return result.map(({ key, ...rest }) => rest);
}

(async () => {
  const bb = new Bannerbear(BANNERBEAR_API);

  const imageFiles = await getImageFiles();
  const imagesObj = {};
  imageFiles.forEach((image) => {
    imagesObj[image.name.split('.')[0]] = `https://drive.google.com/uc?id=${image.id}`;
    fetch(imagesObj[image.name.split('.')[0]]);

  });

  const panelList = await getSheetData();
  const panelObj = transformAndGroupArray(panelList);

  panelObj.forEach(async (item) => {
    const images = await bb.create_image(
      TEMPLATE_ID,
      {
        modifications: [
          {
            name: 'topic',
            text: item.topic,
          },
          {
            name: 'date',
            text: item.date,
          },
          {
            name: 'moderator_name',
            text: item.moderator,
          },
          {
            name: 'image_moderator',
            image_url: imagesObj[item.moderator],
          },
          {
            name: 'guest_name_1',
            text: item.panelists[0].panelist_name,
          },
          {
            name: 'guest_role_1',
            text: item.panelists[0].panelist_title,
          },
          {
            name: 'image_guest_1',
            image_url: imagesObj[item.panelists[0].panelist_name],
          },
          {
            name: 'guest_name_2',
            text: item.panelists[1].panelist_name,
          },
          {
            name: 'guest_role_2',
            text: item.panelists[1].panelist_title,
          },
          {
            name: 'image_guest_2',
            image_url: imagesObj[item.panelists[1].panelist_name],
          },
          {
            name: 'guest_name_3',
            text: item.panelists[2].panelist_name,
          },
          {
            name: 'guest_role_3',
            text: item.panelists[2].panelist_title,
          },
          {
            name: 'image_guest_3',
            image_url: imagesObj[item.panelists[2].panelist_name],
          },
          {
            name: 'guest_name_4',
            text: item.panelists[3].panelist_name,
          },
          {
            name: 'guest_role_4',
            text: item.panelists[3].panelist_title,
          },
          {
            name: 'image_guest_4',
            image_url: imagesObj[item.panelists[3].panelist_name],
          },
        ],
      },
      true
    );

    const imageUrl = images.image_url;
    console.log(imageUrl);
  });
})();
