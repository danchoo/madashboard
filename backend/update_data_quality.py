from real_data_loader import RealDataLoader

if __name__ == "__main__":
    loader = RealDataLoader()
    loader.update_data_quality_status()
    loader.show_data_quality_report()