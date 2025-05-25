# Change Log

All notable changes to the "MQLens" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of MQLens VS Code extension
- Syntax highlighting for MQL4 and MQL5
- IntelliSense support with auto-completion
- Code snippets for common MQL patterns
- Hover documentation for functions and constants
- Go to Definition functionality
- Real-time syntax validation and error detection
- Code formatting support
- Document outline and symbol navigation
- Support for both MQL4 and MQL5 languages
- Comprehensive language configuration
- Built-in commands for compilation and validation
- Extensive function library support
- Error handling and debugging features

### Features

#### Language Support

- **MQL4**: Complete syntax highlighting and IntelliSense
- **MQL5**: Enhanced syntax highlighting with modern MQL5 features
- **File Extensions**: `.mq4`, `.mq5`, `.mqh`
- **Preprocessor Directives**: Full support for `#property`, `#include`, `#define`, etc.

#### IntelliSense Features

- Auto-completion for MQL functions, constants, and keywords
- Context-aware suggestions based on current scope
- Parameter hints for function calls
- Document-specific variable and function suggestions

#### Code Snippets

- Expert Advisor template
- Custom Indicator template
- Order management functions (OrderSend, OrderClose)
- Technical indicator functions (iMA, iRSI, iMACD, iBands)
- Loop templates for order processing
- Error handling patterns
- Common trading functions

#### Validation and Diagnostics

- Real-time syntax error detection
- Semantic analysis for undefined variables/functions
- Type mismatch detection
- Best practice recommendations
- Unreachable code detection
- Unused variable warnings

#### Code Navigation

- Go to Definition for functions and variables
- Document outline with symbol hierarchy
- Find all references
- Symbol search across workspace

#### Formatting

- Automatic code formatting
- Configurable indentation and spacing
- Operator and keyword formatting
- Function call formatting
- Control structure formatting

#### Developer Experience

- Hover documentation for built-in functions
- Parameter tooltips
- Error descriptions with suggestions
- Integrated terminal commands
- Debugging support preparation

### Technical Details

- Built with TypeScript for robust development
- Webpack bundling for optimized performance
- ESLint and Prettier for code quality
- Comprehensive test suite
- VS Code API integration
- Language Server Protocol ready

### Supported Platforms

- Windows
- macOS
- Linux

### Requirements

- VS Code 1.74.0 or higher
- Node.js 16.x or higher (for development)

## [0.0.1] - 2025-05-24

### Added

- Initial release. Created using Anthropic's Sonnet 4
