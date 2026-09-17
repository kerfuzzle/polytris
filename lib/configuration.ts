// Default configuration values
const defaultKeybinds = ['a', 'd', 's', 'w', 'i', 'o', 'p', 'e', 'escape'];
const defaultDAS = 10;
const defaultARR = 2;
const defaultSDF = 6;
// Key to access configuration in LocalStorage
const localStorageKey = 'configuration';

export enum KeybindAction {
	LEFT,
	RIGHT,
	SOFT_DROP,
	HARD_DROP,
	ROTATE_AC,
	ROTATE_CW,
	ROTATE_180,
	SWAP_HOLD,
	EXIT,
}

export class Configuration {
	// Set default configuration values
	private handlingDAS: number = defaultDAS;
	private handlingARR: number = defaultARR;
	private handlingSDF: number = defaultSDF;
	private keybindKeys: string[] = defaultKeybinds;

	constructor() {
		// Loads saved config from LocalStorage if there is one
		this.loadConfig();
	}

	saveConfig() {
		// Convert current config to JSON and save into LocalStorage
		const jsonConfig = JSON.stringify(this);
		window.localStorage.setItem(localStorageKey, jsonConfig);
	}

	loadConfig() {
		// Load JSON string from LocalStorage
		const jsonConfig = window.localStorage.getItem(localStorageKey);
		if (!jsonConfig) return; // No saved config
		// Parse JSON and set all the properties the saved config to the current class
		const parsedConfig = JSON.parse(jsonConfig) as Configuration;
		this.handlingDAS = parsedConfig.handlingDAS;
		this.handlingARR = parsedConfig.handlingARR;
		this.handlingSDF = parsedConfig.handlingSDF;
		this.keybindKeys = parsedConfig.keybindKeys;
	}

	getHandlingConfig() {
		return { das: this.handlingDAS, arr: this.handlingARR, sdf: this.handlingSDF };
	}

	setDAS(newValue: number) {
		// Check if new value is outside the valid range
		if (newValue < 1 || newValue > 20) return false;

		// Assign valid value back to property
		this.handlingDAS = newValue;
		this.saveConfig(); // Save config to LocalStorage
		return true;
	}

	setARR(newValue: number) {
		// Check if new value is outside the valid range
		if (newValue < 0 || newValue > 5) return false;

		// Assign valid value back to property
		this.handlingARR = newValue;
		this.saveConfig(); // Save config to LocalStorage
		return true;
	}

	setSDF(newValue: number) {
		// Check if new value is outside the valid range
		if (newValue < 5 || newValue > 40) return false;

		// Assign valid value back to property
		this.handlingSDF = newValue;
		this.saveConfig(); // Save config to LocalStorage
		return true;
	}

	setKeybind(action: KeybindAction, newKey: string) {
		// Check if key has already been used for another keybind
		newKey = newKey.toLowerCase();
		if (this.keybindKeys.includes(newKey)) return false;

		// Set the actions keybind to the new key
		this.keybindKeys[action] = newKey;
		this.saveConfig(); // Update LocalStorage
		return true;
	}

	getKeybind(action: KeybindAction) {
		// An invalid action value will cause the array access to return undefined
		return this.keybindKeys[action];
	}

	getAction(key: string): KeybindAction | undefined {
		// Convert the key to lowercase for consistency
		// as some html key codes have uppercase characters
		key = key.toLowerCase();
		// Finds the key's index in the keybinds array
		const index = this.keybindKeys.indexOf(key);
		// Returns undefined if the specified key is not mapped
		// else it returns the index (Which is its corresponding action)
		if (index === -1) return undefined;
		else return index;
	}
}

/*
const testConfig = new Configuration();
for (let i = 0; i < 8; i++) {
	console.log(KeybindAction[i] + ' ' + testConfig.getKeybind(i));
}
// Valid as 'a' is LEFT by default
console.log(testConfig.getAction('a'));
// Valid as 'escape' is EXIT by default
console.log(testConfig.getAction('escape'));
// Invalid as 'z' is not bound to anything
console.log(testConfig.getAction('z'));
// Valid
console.log(testConfig.setKeybind(KeybindAction.RIGHT, 'm'));
// Invalid as 'a' is already bound to LEFT
console.log(testConfig.setKeybind(KeybindAction.SOFT_DROP, 'a'));
// Should output the default config
console.log(testConfig.getHandlingConfig());
// Test invalid values
testConfig.setDAS(-1);
testConfig.setARR(-1);
testConfig.setSDF(-1);
console.log(testConfig.getHandlingConfig());
// Test valid values on boundary
testConfig.setDAS(20);
testConfig.setARR(5);
testConfig.setSDF(40);
console.log(testConfig.getHandlingConfig());
// Test valid values
testConfig.setDAS(5);
testConfig.setARR(3);
testConfig.setSDF(14);
*/
