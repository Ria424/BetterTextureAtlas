/**
 * @constant
 * @type {string[]}
 */
var VERSION = fl.version.split(" ")[1].split(",");

/**
 * @param {string[]} symbols
 * @returns {string}
 */
function xmlData(symbols) {
	var data = FLfile.read(fl.configURI + "Commands/bta_src/BTADialog.xml");
	var saveData = FLfile.read(fl.configURI + "Commands/bta_src/saveBTA.txt").split("\n");

	fl.trace(saveData);

	var formatSymbolName = String(symbols[0]).split("/").pop().split(",").pop();
	var fileuri = (saveData[0] != "") ? saveData[0].split("\\").join("/") + "/" + formatSymbolName : formatSymbolName;

	data = data.split("$CONFIGDIR").join(fl.configDirectory);
	data = data.split("$FILEURI").join(fileuri);
	data = data.split("$SHP").join(saveData[1]);
	data = data.split("$BRD").join(saveData[2]);
	data = data.split("$RES").join(saveData[3]);
	data = data.split("$OPTDIM").join(saveData[4]);
	data = data.split("$OPTAN").join(saveData[5]);
	data = data.split("$FLAT").join(saveData[6]);
	data = data.split("$ROT").join(saveData[9]);

	var buttonWidth = 0;
	if (parseInt(VERSION[0]) >= 20)
		buttonWidth = 45;

	data = data.split("$BWI").join(buttonWidth);

	return data;
}

/**
 * @returns {string}
 */
function xmlAddData() {
	var data = FLfile.read(fl.configURI + "Commands/bta_src/BTAAdd.xml");
	var saveData = FLfile.read(fl.configURI + "Commands/bta_src/saveADDBTA.txt").split("\n");

	data = data.split("$INSYMB").join(saveData[0]);
	data = data.split("$BATX").join(saveData[1]);
	data = data.split("$INCS").join(saveData[2]);
	data = data.split("$BOFS").join(saveData[3]);
	data = data.split("$BF").join(saveData[4]);
	data = data.split("$BTW").join(saveData[5]);

	var buttonWidth = 0;
	if (parseInt(VERSION[0]) >= 20)
		buttonWidth = 50;

	data = data.split("$BWI").join(buttonWidth);

	return data;
}

function xmlSaveStuff() {
	var config = fl.configURI;

	var rawXML = xmlAddData();

	var xPan = null;

	// Flash doesnt support direct panels from strings so we gotta create a temp xml
	if (parseInt(VERSION[0]) < 15 && parseInt(VERSION[1]) < 1) {
		var tempP = config + "Commands/bta_src/_BTAD.xml";
		FLfile.write(tempP, rawXML, null);
		xPan = fl.xmlPanel(tempP);
		FLfile.remove(tempP);
	}
	else {
		xPan = fl.xmlPanelFromString(rawXML);
	}

	var save = [];

	save[0] = xPan.InSym;
	save[1] = xPan.BATX;
	save[2] = xPan.INCS;
	save[3] = xPan.BOFS;

	FLfile.write(fl.configURI + "Commands/bta_src/saveADDBTA.txt", save.join("\n"));
}

function theme() {
	var stuff = "";
	if (VERSION[0] >= 13) {
		if (VERSION[0] < 20)
			stuff = fl.getThemeColor("themeAppBackgroundColor");
		else {
			stuff = fl.getThemeColor("themeAppBackgroundColor");
			switch (stuff) {
				case "#404040": stuff = (VERSION[0] >= 24) ? "#323232" : "#333333"; break;
				case "#262626": stuff = (VERSION[0] >= 24) ? "#1D1D1D" : "#1f1f1f"; break;
				case "#B9B9B9": stuff = (VERSION[0] >= 24) ? "#F8F8F8" : "#f5f5f5"; break;
				case "#F2F2F2": stuff = "#ffffff"; break;
			}
		}
	}
	else {
		stuff = "#f0f0f0";
	}

	FLfile.write(fl.configURI + "Commands/bta_src/BTATheme.txt", stuff);
}

function setupSaves() {
	if (!FLfile.exists(fl.configURI + "Commands/bta_src/saveBTA.txt")) {
		var saveConfig = [
			"", // pos
			0, // ShpPad
			0, // BrdPad
			1, // res
			true, // optDimens
			true, // optAn
			false // flatten
		];

		FLfile.write(fl.configURI + "Commands/bta_src/saveBTA.txt", saveConfig.join("\n"));
	}
	if (!FLfile.exists(fl.configURI + "Commands/bta_src/saveADDBTA.txt")) {
		var save = [];

		save[0] = inlineSym;
		save[1] = bakeTexts;
		save[2] = includeSnd;
		save[3] = bakeOneFR;
		save[4] = bakedFilters;
		save[5] = bakedTweens;

		FLfile.write(fl.configURI + "Commands/bta_src/saveADDBTA.txt", save.join("\n"));
	}
}